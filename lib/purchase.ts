// Post-deal purchase process for a Singapore private resale condo:
// OTP → Exercise → Completion, with every task dated off three anchors:
//   O = OTP date (option fee paid, OTP received)
//   E = exercise deadline = O + exerciseWeeks (standard: 2 weeks / 14 days)
//   C = completion date  = E + completionWeeks (standard: 10-12 weeks)
// Task numbers are canonical (T1..) and never change, so predecessor /
// successor references stay valid regardless of configured durations.
//
// Key rules encoded below (verified against IRAS/CVY conventions, 2026):
// - Option fee: typically 1% cash. Exercise fee: typically 4% (cash/cheque
//   to seller's conveyancing account) — CPF cannot be used for the first 5%.
// - Buyer's Stamp Duty (+ABSD if applicable) is due within 14 days of
//   exercising the OTP.
// - IPA before committing; loan Letter of Offer signed before exercising.

export type TaskOwner = "me" | "broker" | "banker" | "lawyer" | "seller-agent";

export const OWNER_LABELS: Record<TaskOwner, string> = {
  me: "You",
  broker: "Mortgage broker",
  banker: "Banker",
  lawyer: "Lawyer (conveyancer)",
  "seller-agent": "Seller's agent",
};

export const OWNER_COLORS: Record<TaskOwner, string> = {
  me: "#1e5c40",
  broker: "#c07a1a",
  banker: "#2c5c96",
  lawyer: "#5b48a2",
  "seller-agent": "#8a6d0b",
};

export type PurchaseTask = {
  no: number; // canonical number, shown as T1..T30
  title: string;
  detail: string;
  owners: TaskOwner[]; // first owner = primary
  anchor: "otp" | "exercise" | "completion";
  offsetDays: number; // relative to anchor
  prereqs: number[]; // canonical numbers of predecessor tasks
};

export type PurchasePlan = {
  propertyName: string;
  /** id of the linked viewing (picked from viewed properties) */
  propertyId?: string;
  otpDate: string; // ISO date the OTP was (or will be) granted
  exerciseWeeks: number; // default 2
  completionWeeks: number; // default 10 (after exercise)
  done: Record<number, boolean>;
};

export function emptyPlan(): PurchasePlan {
  return {
    propertyName: "",
    otpDate: new Date().toISOString().slice(0, 10),
    exerciseWeeks: 2,
    completionWeeks: 10,
    done: {},
  };
}

export const PURCHASE_TASKS: PurchaseTask[] = [
  // ---------- Phase 1 · Preparation (before OTP) ----------
  {
    no: 1,
    title: "Confirm budget, cash and CPF position",
    detail:
      "Work out total funds: at least 5% of price in CASH (1% option + 4% exercise — CPF cannot be used for these), CPF OA balance for the downpayment/BSD reimbursement, and your ABSD status (first property? nationality?). Get your CPF Property statement from the CPF portal and check TDSR headroom (55%).",
    owners: ["me"],
    anchor: "otp",
    offsetDays: -14,
    prereqs: [],
  },
  {
    no: 2,
    title: "Engage a mortgage broker (or shortlist banks yourself)",
    detail:
      "Brokers are free for you (banks pay them) and compare packages across all lenders — e.g. Redbrick, Mortgage Master, PropertyGuru Finance. Alternatively approach 2-3 banks directly. Compare: fixed vs floating, lock-in period, penalties, board vs SORA-pegged rates.",
    owners: ["me", "broker"],
    anchor: "otp",
    offsetDays: -14,
    prereqs: [1],
  },
  {
    no: 3,
    title: "Obtain In-Principle Approval (IPA)",
    detail:
      "Broker/bank submits income docs (NOA, CPF history, payslips) for IPA. Usually valid ~30 days. NEVER pay the option fee without IPA — if the loan falls through you forfeit the 1%. Confirm max loan (LTV 75%), tenure and indicative rate in writing.",
    owners: ["banker", "broker", "me"],
    anchor: "otp",
    offsetDays: -10,
    prereqs: [2],
  },
  {
    no: 4,
    title: "Appoint a conveyancing law firm",
    detail:
      "Choose a firm that is on BOTH your bank's panel AND the CPF Board panel (ask the broker/banker for the panel list; most established firms qualify). Conveyancing fees run ~S$2,500-3,500 all-in. Confirm they can meet your exercise and completion dates before appointing. You'll need them from the option period onwards.",
    owners: ["me"],
    anchor: "otp",
    offsetDays: -7,
    prereqs: [1],
  },
  {
    no: 5,
    title: "Negotiate price & OTP terms",
    detail:
      "Through the seller's agent: final price, option period (standard 14 days), completion period (standard 10-12 weeks from exercise), vacant possession or existing tenancy, furniture/fittings included, and any early-access for renovation measurement. Everything agreed must be WRITTEN into the OTP.",
    owners: ["seller-agent", "me"],
    anchor: "otp",
    offsetDays: -3,
    prereqs: [3],
  },
  {
    no: 6,
    title: "Prepare the 1% option fee",
    detail:
      "Cashier's order or personal cheque payable to the seller (exact payee name per the seller's agent). Cash only — CPF cannot be used. Verify the seller's identity matches the title (ask the agent for a title search or do one on INLIS ~S$5-16).",
    owners: ["me"],
    anchor: "otp",
    offsetDays: -1,
    prereqs: [5],
  },

  // ---------- Phase 2 · OTP day ----------
  {
    no: 7,
    title: "Pay option fee & receive the signed OTP",
    detail:
      "Exchange the 1% for the OTP signed by ALL registered owners. Check carefully: names/NRIC of all owners, address & unit, price, option expiry date/time, exercise mode, completion period, inclusions. Keep the original safe — it is a legal document you must present when exercising.",
    owners: ["me", "seller-agent"],
    anchor: "otp",
    offsetDays: 0,
    prereqs: [6],
  },
  {
    no: 8,
    title: "Send OTP copies to your lawyer and banker/broker — same day",
    detail:
      "The lawyer needs it to review terms and prepare the exercise; the bank needs it to issue the formal Letter of Offer and order the valuation. The 14-day clock is already running.",
    owners: ["me"],
    anchor: "otp",
    offsetDays: 0,
    prereqs: [7],
  },

  // ---------- Phase 3 · Option period (O → E) ----------
  {
    no: 9,
    title: "Bank conducts formal valuation",
    detail:
      "The bank sends a valuer to the unit. If the valuation comes in BELOW the agreed price, the shortfall must be topped up in cash (loan is 75% of the LOWER of price/valuation). Chase the banker — this must land in time to sign the Letter of Offer before exercising.",
    owners: ["banker"],
    anchor: "otp",
    offsetDays: 2,
    prereqs: [8],
  },
  {
    no: 10,
    title: "Lawyer reviews OTP and runs title & bankruptcy searches",
    detail:
      "Lawyer verifies the sellers are the registered owners, checks for encumbrances/caveats on the title, runs bankruptcy searches on the sellers, and advises on any unusual OTP clauses before you commit 4% more.",
    owners: ["lawyer"],
    anchor: "otp",
    offsetDays: 3,
    prereqs: [8],
  },
  {
    no: 11,
    title: "Sign the loan Letter of Offer",
    detail:
      "Confirm final package: amount, rate, lock-in, tenure, fire-insurance requirement, cancellation fees. This must be SIGNED before you exercise — exercising without a committed loan risks the entire 5%. Tell the bank your intended completion date.",
    owners: ["me", "banker", "broker"],
    anchor: "otp",
    offsetDays: 6,
    prereqs: [9, 3],
  },
  {
    no: 12,
    title: "Sign CPF usage authorization (if using CPF)",
    detail:
      "At the law firm: sign the CPF withdrawal application/authorization so your lawyer (as CPF-panel solicitor) can apply to the CPF Board for release of OA funds toward the downpayment at completion and BSD reimbursement.",
    owners: ["me", "lawyer"],
    anchor: "otp",
    offsetDays: 7,
    prereqs: [10],
  },
  {
    no: 13,
    title: "EXERCISE the OTP + pay 4%",
    detail:
      "At your law firm before the option expires: sign the acceptance copy of the OTP and hand over the 4% exercise fee (cashier's order per OTP instructions, usually to the seller's conveyancing/law firm account). Missing the deadline = option lapses and the 1% is forfeited. Do this 1-2 days BEFORE the deadline, never on the last hour.",
    owners: ["me", "lawyer"],
    anchor: "exercise",
    offsetDays: -1,
    prereqs: [10, 11],
  },
  {
    no: 14,
    title: "Lawyer lodges a caveat on the property",
    detail:
      "Registered with SLA to protect your interest as purchaser — prevents the seller from dealing with the title behind your back between exercise and completion.",
    owners: ["lawyer"],
    anchor: "exercise",
    offsetDays: 2,
    prereqs: [13],
  },
  {
    no: 15,
    title: "Pay Buyer's Stamp Duty (+ABSD if applicable) — hard deadline",
    detail:
      "Due within 14 DAYS of exercising. Your lawyer e-stamps via IRAS; you provide the funds (cash first — CPF reimbursement possible later if eligible). BSD is tiered (up to 6% on the top band); ABSD depends on residency & property count. IRAS late-payment penalties are steep — never miss this.",
    owners: ["lawyer", "me"],
    anchor: "exercise",
    offsetDays: 10,
    prereqs: [13],
  },

  // ---------- Phase 4 · Between exercise and completion ----------
  {
    no: 16,
    title: "Sign mortgage & transfer documents, CPF forms",
    detail:
      "At the law firm: Transfer instrument, Mortgage-in-Escrow for the bank, CPF charge documents. One visit usually covers all. Bring NRIC/passport.",
    owners: ["me", "lawyer"],
    anchor: "exercise",
    offsetDays: 14,
    prereqs: [15, 12],
  },
  {
    no: 17,
    title: "Lawyer sends legal requisitions to government agencies",
    detail:
      "Standard searches with LTA (road/MRT lines), PUB (drainage), URA, NEA, BCA — to confirm no adverse plans or notices affect the unit. Adverse replies can allow you to walk away per OTP terms; your lawyer reviews all replies.",
    owners: ["lawyer"],
    anchor: "exercise",
    offsetDays: 21,
    prereqs: [13],
  },
  {
    no: 18,
    title: "Arrange fire insurance (and consider home contents insurance)",
    detail:
      "The bank requires fire insurance on a mortgaged unit from completion. For condos the MCST's master policy covers the building structure — the bank usually accepts this; confirm with the banker whether a separate policy is needed. Home contents/renovation insurance is optional but wise.",
    owners: ["me", "banker"],
    anchor: "completion",
    offsetDays: -28,
    prereqs: [16],
  },
  {
    no: 19,
    title: "Prepare completion funds per lawyer's statement",
    detail:
      "Lawyer issues a completion statement: balance purchase price minus loan minus CPF, plus apportioned property tax & maintenance fees, legal fees, and misc. Move cash to accessible accounts early; cashier's orders may be needed a few days ahead.",
    owners: ["me"],
    anchor: "completion",
    offsetDays: -21,
    prereqs: [16],
  },
  {
    no: 20,
    title: "Review apportionments with the seller's side",
    detail:
      "Property tax, MCST maintenance fees (and rental/deposit if sold with tenancy) are pro-rated to the completion date between the two law firms. Check the math on the completion account.",
    owners: ["lawyer"],
    anchor: "completion",
    offsetDays: -14,
    prereqs: [17, 19],
  },
  {
    no: 21,
    title: "CPF Board releases funds / bank confirms drawdown",
    detail:
      "Lawyer confirms the CPF Board is ready to release your OA funds and the bank is ready to disburse the loan to the seller's side at completion. Chase both a week ahead — late funds are the #1 cause of delayed completion.",
    owners: ["lawyer", "banker"],
    anchor: "completion",
    offsetDays: -7,
    prereqs: [19, 16],
  },
  {
    no: 22,
    title: "Pre-completion inspection of the unit",
    detail:
      "Walk the unit shortly before completion: vacant possession (unless tenanted per OTP), all included furniture/fittings present, no new damage, aircon working. Raise issues to your lawyer BEFORE completion — leverage disappears after keys change hands.",
    owners: ["me", "seller-agent"],
    anchor: "completion",
    offsetDays: -3,
    prereqs: [20],
  },
  {
    no: 23,
    title: "COMPLETION — balance paid, title transferred, keys collected",
    detail:
      "Happens between the two law firms (you usually don't need to attend, but arrange key handover). Lawyer pays the balance (loan + CPF + your cash), receives the transfer documents, and you get keys, access cards and car-park transponders. Congratulations!",
    owners: ["lawyer", "me"],
    anchor: "completion",
    offsetDays: 0,
    prereqs: [21, 22, 18],
  },

  // ---------- Phase 5 · Post-completion ----------
  {
    no: 24,
    title: "Record the unit's condition & meter readings",
    detail:
      "On key collection day: photograph every room, note SP meter readings (electricity/water/gas), collect all warranties, manuals, spare keys and access cards from the agent.",
    owners: ["me"],
    anchor: "completion",
    offsetDays: 0,
    prereqs: [23],
  },
  {
    no: 25,
    title: "Open utilities & internet accounts",
    detail:
      "SP Group account (or open electricity market retailer) from completion date; book fibre installation (can take 1-2 weeks).",
    owners: ["me"],
    anchor: "completion",
    offsetDays: 1,
    prereqs: [24],
  },
  {
    no: 26,
    title: "Register with the MCST / management office",
    detail:
      "Update owner records, get resident access cards, car-park lot allocation/season parking, move-in booking (many condos require booking the lift & a refundable deposit for moving).",
    owners: ["me"],
    anchor: "completion",
    offsetDays: 2,
    prereqs: [24],
  },
  {
    no: 27,
    title: "Lawyer registers the transfer & mortgage with SLA",
    detail:
      "Title registration typically finalizes a few weeks after completion; the lawyer confirms once done and sends your complete document set. CPF lien is registered alongside. File everything.",
    owners: ["lawyer"],
    anchor: "completion",
    offsetDays: 7,
    prereqs: [23],
  },
  {
    no: 28,
    title: "Service aircon, change locks, plan renovation",
    detail:
      "Change/rekey locks, deep-clean, service all aircon units. Renovation in a condo needs MCST approval (submit contractor's plan, pay reno deposit, observe permitted hours) before work starts.",
    owners: ["me"],
    anchor: "completion",
    offsetDays: 7,
    prereqs: [26],
  },
];

// next[] = inverse of prereqs, computed once
export const TASK_NEXT: Record<number, number[]> = (() => {
  const next: Record<number, number[]> = {};
  for (const t of PURCHASE_TASKS) {
    for (const p of t.prereqs) {
      (next[p] ??= []).push(t.no);
    }
  }
  return next;
})();

export function taskDate(task: PurchaseTask, plan: PurchasePlan): Date {
  const otp = new Date(plan.otpDate + "T00:00:00");
  const anchor = new Date(otp);
  if (task.anchor === "exercise") anchor.setDate(anchor.getDate() + plan.exerciseWeeks * 7);
  if (task.anchor === "completion")
    anchor.setDate(anchor.getDate() + (plan.exerciseWeeks + plan.completionWeeks) * 7);
  anchor.setDate(anchor.getDate() + task.offsetDays);
  return anchor;
}

/** Tasks sorted by scheduled date (ties by canonical number). */
export function scheduledTasks(plan: PurchasePlan): (PurchaseTask & { date: Date })[] {
  return PURCHASE_TASKS.map((t) => ({ ...t, date: taskDate(t, plan) })).sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.no - b.no
  );
}
