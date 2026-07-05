// Auto-populate checklist answers from the condo database when a project is
// linked. Only fills questions the user hasn't answered yet — everything
// remains a normal chip answer the user can change (the data is indicative
// and can be wrong).

import type { CondoEntry } from "./types";

/** Approximate remaining lease bucket for fin_lease. 99-year leases usually
 *  start ~4 years before TOP. */
function leaseAnswer(tenure: string | undefined, top: number | undefined): string | undefined {
  if (!tenure) return undefined;
  if (/freehold|999|9\d\d-year/i.test(tenure)) return "freehold";
  if (!/99-year|103-year/i.test(tenure) || !top) return undefined;
  const leaseStart = top - 4;
  const remaining = 99 - (new Date().getFullYear() - leaseStart);
  if (remaining > 80) return "long";
  if (remaining >= 60) return "mid";
  return "short";
}

function has(facilities: string[] | undefined, re: RegExp): boolean {
  return !!facilities?.some((f) => re.test(f));
}

/** Derive checklist answers from database facts. Returns only derivable keys. */
export function derivedAnswers(entry: CondoEntry): Record<string, string> {
  const out: Record<string, string> = {};
  const f = entry.facilities;

  // 🏊 Building & Facilities — presence from DB; condition defaults to "good"
  // (adjust on site). Absent facility -> N/A.
  if (f?.length) {
    out.fac_pool = has(f, /pool/i) ? "good" : "na";
    out.fac_gym = has(f, /gym|fitness/i) ? "good" : "na";
    out.fac_other = has(f, /tennis|bbq|function|playground|clubhouse|court/i) ? "good" : "na";
    if (has(f, /security/i)) out.fac_security = "good";
  }
  if (entry.carpark) out.fac_carpark = entry.carpark;
  if (entry.evCharging) out.fac_ev = entry.evCharging;

  // 🧾 Management & Fees
  if (entry.maintFeeBand) {
    out.mgmt_fee = { low: "worth", medium: "ok", high: "high" }[entry.maintFeeBand];
  }
  if (entry.enbloc) out.mgmt_enbloc = entry.enbloc;

  // 📍 Location & Connectivity
  if (entry.mrtWalkMins !== undefined) {
    out.loc_mrt =
      entry.mrtWalkMins <= 5 ? "u5" : entry.mrtWalkMins <= 10 ? "u10" : entry.mrtWalkMins <= 15 ? "u15" : "o15";
  }
  if (entry.schools1km) out.loc_schools = entry.schools1km.length ? "some" : "none";

  // 💰 Price & Deal
  const lease = leaseAnswer(entry.tenure, entry.top);
  if (lease) out.fin_lease = lease;
  if (entry.rentalYieldPct !== undefined) {
    out.fin_yield =
      entry.rentalYieldPct >= 3.6
        ? "excellent"
        : entry.rentalYieldPct >= 3.1
          ? "good"
          : entry.rentalYieldPct >= 2.7
            ? "fair"
            : "poor";
  }

  return out;
}

/** Merge derived answers into existing ones without overwriting anything the
 *  user already answered. Returns the merged map and how many were added. */
export function prefillAnswers(
  entry: CondoEntry,
  existing: Record<string, string>
): { answers: Record<string, string>; added: number } {
  const derived = derivedAnswers(entry);
  const answers = { ...existing };
  let added = 0;
  for (const [k, v] of Object.entries(derived)) {
    if (answers[k]) continue;
    answers[k] = v;
    added++;
  }
  return { answers, added };
}
