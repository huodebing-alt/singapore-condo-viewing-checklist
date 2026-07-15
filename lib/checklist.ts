// The Singapore resale-condo viewing checklist.
// Every question is answered by tapping a chip — no typing needed.
// Options carry a score 0-3 (higher = better). Options without a score
// (facing, tenancy status, etc.) are informational and excluded from scoring.

export type Option = { value: string; label: string; score?: number };
export type Question = { id: string; label: string; tip?: string; options: Option[] };
export type Section = { id: string; title: string; emoji: string; questions: Question[] };

const NA: Option = { value: "na", label: "N/A" };

// Shared scales
const QUALITY: Option[] = [
  { value: "poor", label: "Poor", score: 0 },
  { value: "fair", label: "Fair", score: 1 },
  { value: "good", label: "Good", score: 2 },
  { value: "excellent", label: "Excellent", score: 3 },
];

const SEVERITY: Option[] = [
  { value: "none", label: "None", score: 3 },
  { value: "minor", label: "Minor", score: 2 },
  { value: "moderate", label: "Moderate", score: 1 },
  { value: "serious", label: "Serious", score: 0 },
];

const YES_NO: Option[] = [
  { value: "yes", label: "Yes", score: 3 },
  { value: "partly", label: "Partly", score: 2 },
  { value: "no", label: "No", score: 0 },
];

export const SECTIONS: Section[] = [
  {
    id: "light",
    title: "Light & Orientation",
    emoji: "☀️",
    questions: [
      { id: "light_living", label: "Natural light in living room", options: QUALITY },
      { id: "light_bedrooms", label: "Natural light in bedrooms", options: QUALITY },
      {
        id: "light_no_lamps",
        label: "Bright enough without switching on lights?",
        tip: "View in the daytime; try all rooms with lights off",
        options: YES_NO,
      },
      {
        id: "light_west_sun",
        label: "Afternoon west-sun exposure",
        tip: "West-facing units get hot 2–6pm; check which rooms take the hit",
        options: [
          { value: "none", label: "None", score: 3 },
          { value: "partial", label: "Partial", score: 2 },
          { value: "direct", label: "Direct", score: 0 },
        ],
      },
      {
        id: "light_blocked",
        label: "Light blocked by neighbouring blocks?",
        options: [
          { value: "unblocked", label: "Not blocked", score: 3 },
          { value: "partial", label: "Partially", score: 1 },
          { value: "heavy", label: "Heavily", score: 0 },
        ],
      },
    ],
  },
  {
    id: "noise",
    title: "Noise & Quietness",
    emoji: "🔇",
    questions: [
      {
        id: "noise_overall",
        label: "Overall quietness during viewing",
        tip: "Stand silent for 2 min with windows OPEN",
        options: QUALITY,
      },
      {
        id: "noise_traffic",
        label: "Road / expressway noise (windows open)",
        options: [
          { value: "silent", label: "Silent", score: 3 },
          { value: "faint", label: "Faint", score: 2 },
          { value: "noticeable", label: "Noticeable", score: 1 },
          { value: "loud", label: "Loud", score: 0 },
        ],
      },
      {
        id: "noise_mrt_flight",
        label: "MRT track / flight-path noise",
        tip: "Check timings — trains every few minutes, flight paths vary by hour",
        options: [
          { value: "none", label: "None", score: 3 },
          { value: "occasional", label: "Occasional", score: 2 },
          { value: "frequent", label: "Frequent", score: 0 },
          NA,
        ],
      },
      {
        id: "noise_construction",
        label: "Construction nearby",
        tip: "Check URA Master Plan for empty plots next door — future site = years of noise",
        options: [
          { value: "none", label: "None", score: 3 },
          { value: "minor", label: "Minor", score: 2 },
          { value: "major", label: "Major ongoing", score: 0 },
          { value: "upcoming", label: "Upcoming site", score: 1 },
        ],
      },
      {
        id: "noise_neighbours",
        label: "Neighbour noise (footsteps, renovation, dogs)",
        options: SEVERITY,
      },
      {
        id: "noise_facilities",
        label: "Noise from facilities below (pool deck, playground, BBQ)",
        options: [...SEVERITY, NA],
      },
    ],
  },
  {
    id: "air",
    title: "Ventilation & Smell",
    emoji: "🌬️",
    questions: [
      {
        id: "air_cross_vent",
        label: "Cross-ventilation / natural breeze",
        tip: "Open windows on both sides and feel for airflow",
        options: QUALITY,
      },
      { id: "air_musty", label: "Musty / damp smell", options: SEVERITY },
      {
        id: "air_chute",
        label: "Rubbish chute smell (kitchen / common chute)",
        options: [...SEVERITY, NA],
      },
      { id: "air_cooking", label: "Cooking smells from neighbours", options: SEVERITY },
      {
        id: "air_bathroom_vent",
        label: "Bathroom ventilation",
        options: [
          { value: "window", label: "Window", score: 3 },
          { value: "mechanical", label: "Exhaust fan", score: 2 },
          { value: "none", label: "None", score: 0 },
        ],
      },
    ],
  },
  {
    id: "condition",
    title: "Interior Condition",
    emoji: "🧱",
    questions: [
      {
        id: "cond_water_stains",
        label: "Water stains / leak marks on ceilings & walls",
        tip: "Look above windows, in bathrooms, and at aircon trunking",
        options: SEVERITY,
      },
      { id: "cond_mould", label: "Visible mould", options: SEVERITY },
      {
        id: "cond_cracks",
        label: "Cracks in walls / beams / floor tiles",
        tip: "Hairline is cosmetic; wide or diagonal cracks need a professional check",
        options: SEVERITY,
      },
      { id: "cond_flooring", label: "Flooring condition", options: QUALITY },
      {
        id: "cond_windows",
        label: "Windows & sliding doors (open/close smoothly, seals)",
        options: QUALITY,
      },
      { id: "cond_doors", label: "Doors, locks & gate", options: QUALITY },
      {
        id: "cond_ceiling",
        label: "Ceiling height feel",
        options: [
          { value: "low", label: "Low", score: 0 },
          { value: "standard", label: "Standard", score: 2 },
          { value: "high", label: "High", score: 3 },
        ],
      },
      {
        id: "cond_reno",
        label: "Renovation needed",
        options: [
          { value: "movein", label: "Move-in ready", score: 3 },
          { value: "light", label: "Light reno", score: 2 },
          { value: "major", label: "Major reno", score: 1 },
          { value: "overhaul", label: "Total overhaul", score: 0 },
        ],
      },
      {
        id: "cond_leak_history",
        label: "Past leaks / waterproofing issues (ask seller & agent)",
        options: [
          { value: "none", label: "None declared", score: 3 },
          { value: "fixed", label: "Had, fixed", score: 2 },
          { value: "unresolved", label: "Unresolved", score: 0 },
          { value: "unsure", label: "Unsure", score: 1 },
        ],
      },
    ],
  },
  {
    id: "kitchen",
    title: "Kitchen & Wet Areas",
    emoji: "🍳",
    questions: [
      { id: "kit_layout", label: "Kitchen size & layout", options: QUALITY },
      { id: "kit_cabinets", label: "Cabinets & countertop condition", options: QUALITY },
      {
        id: "kit_appliances",
        label: "Hob / hood / appliances included & working",
        options: [...YES_NO, NA],
      },
      {
        id: "kit_water_pressure",
        label: "Water pressure",
        tip: "Turn on the shower + a tap at the same time",
        options: [
          { value: "weak", label: "Weak", score: 0 },
          { value: "ok", label: "OK", score: 2 },
          { value: "strong", label: "Strong", score: 3 },
        ],
      },
      {
        id: "kit_drainage",
        label: "Drainage (sinks, shower, balcony)",
        tip: "Run water and watch it drain; slow drains hint at pipe issues",
        options: QUALITY,
      },
      {
        id: "kit_under_sink",
        label: "Leaks / damage under sinks & around toilets",
        options: SEVERITY,
      },
      {
        id: "kit_heater",
        label: "Water heater type",
        options: [
          { value: "storage", label: "Storage tank", score: 2 },
          { value: "instant", label: "Instant", score: 2 },
          { value: "old", label: "Old / needs replacing", score: 0 },
          { value: "unsure", label: "Unsure", score: 1 },
        ],
      },
      {
        id: "kit_yard",
        label: "Service yard / laundry area",
        options: [
          { value: "good", label: "Yes, good size", score: 3 },
          { value: "small", label: "Yes, small", score: 2 },
          { value: "none", label: "None", score: 0 },
        ],
      },
    ],
  },
  {
    id: "mech",
    title: "Aircon & Electrical",
    emoji: "❄️",
    questions: [
      {
        id: "mech_aircon_cond",
        label: "Aircon condition",
        tip: "Ask the age and last servicing date; replacing a full system runs $4–10K",
        options: QUALITY,
      },
      {
        id: "mech_aircon_age",
        label: "Aircon age",
        options: [
          { value: "new", label: "< 3 yrs", score: 3 },
          { value: "mid", label: "3–8 yrs", score: 2 },
          { value: "old", label: "> 8 yrs", score: 1 },
          { value: "unsure", label: "Unsure", score: 1 },
        ],
      },
      {
        id: "mech_ledge",
        label: "Aircon ledge safely accessible for servicing",
        options: [...YES_NO, NA],
      },
      { id: "mech_sockets", label: "Enough power points where you need them", options: YES_NO },
      {
        id: "mech_db",
        label: "Electrical wiring / DB box",
        options: [
          { value: "original", label: "Original", score: 1 },
          { value: "partial", label: "Partially updated", score: 2 },
          { value: "rewired", label: "Fully rewired", score: 3 },
          { value: "unsure", label: "Unsure", score: 1 },
        ],
      },
      { id: "mech_lights_fans", label: "Lighting points & ceiling fans", options: QUALITY },
    ],
  },
  {
    id: "layout",
    title: "Layout & Space",
    emoji: "📐",
    questions: [
      {
        id: "lay_efficiency",
        label: "Layout efficiency (squarish, little wasted corridor)",
        options: QUALITY,
      },
      {
        id: "lay_bay_windows",
        label: "Bay windows / planters eating into floor area",
        tip: "Common in 2000s condos — you pay PSF for space you can't stand on",
        options: [
          { value: "none", label: "None", score: 3 },
          { value: "some", label: "Some", score: 1 },
          { value: "alot", label: "A lot", score: 0 },
        ],
      },
      { id: "lay_storage", label: "Storage space / store room", options: QUALITY },
      {
        id: "lay_master",
        label: "Master bedroom fits king/queen + wardrobe comfortably",
        options: YES_NO,
      },
      { id: "lay_other_beds", label: "Other bedrooms usable size", options: [...QUALITY, NA] },
      {
        id: "lay_balcony",
        label: "Balcony size & usability",
        options: [...QUALITY, NA],
      },
      { id: "lay_dining", label: "Proper dining area", options: YES_NO },
      {
        id: "lay_helper",
        label: "Helper's room / utility room",
        options: [
          { value: "yes", label: "Yes", score: 3 },
          { value: "small", label: "Yes, tiny", score: 2 },
          { value: "no", label: "None", score: 1 },
          NA,
        ],
      },
    ],
  },
  {
    id: "view",
    title: "View & Privacy",
    emoji: "🌇",
    questions: [
      {
        id: "view_living",
        label: "View from living room / balcony",
        options: [
          { value: "unblocked", label: "Unblocked", score: 3 },
          { value: "partial", label: "Partially blocked", score: 2 },
          { value: "blocked", label: "Facing another block", score: 0 },
        ],
      },
      {
        id: "view_type",
        label: "View type",
        options: [
          { value: "greenery", label: "Greenery" },
          { value: "pool", label: "Pool" },
          { value: "city", label: "City" },
          { value: "sea", label: "Sea/River" },
          { value: "block", label: "Another block" },
          { value: "road", label: "Road" },
        ],
      },
      {
        id: "view_privacy",
        label: "Privacy — can neighbours see in?",
        options: [
          { value: "private", label: "Very private", score: 3 },
          { value: "some", label: "Somewhat", score: 2 },
          { value: "exposed", label: "Overlooked", score: 0 },
        ],
      },
      {
        id: "view_undesirable",
        label: "Faces bin centre / substation / carpark entrance / temple-mosque speakers",
        tip: "Walk the block perimeter and look down from the unit",
        options: [
          { value: "no", label: "No", score: 3 },
          { value: "partly", label: "Somewhat", score: 1 },
          { value: "yes", label: "Yes", score: 0 },
        ],
      },
    ],
  },
  {
    id: "facilities",
    title: "Building & Facilities",
    emoji: "🏊",
    questions: [
      { id: "fac_lifts", label: "Lifts: condition & waiting time", options: QUALITY },
      {
        id: "fac_corridors",
        label: "Lobby, corridors & common area upkeep",
        tip: "Poor upkeep = weak MCST — expect problems and levies",
        options: QUALITY,
      },
      { id: "fac_pool", label: "Pool condition", options: [...QUALITY, NA] },
      { id: "fac_gym", label: "Gym condition & equipment", options: [...QUALITY, NA] },
      {
        id: "fac_other",
        label: "Other facilities (BBQ, function room, tennis, playground)",
        options: [...QUALITY, NA],
      },
      { id: "fac_security", label: "Security (guardhouse, access control, CCTV)", options: QUALITY },
      {
        id: "fac_carpark",
        label: "Carpark availability",
        options: [
          { value: "ample", label: "1-to-1 or better", score: 3 },
          { value: "ok", label: "Usually available", score: 2 },
          { value: "tight", label: "Tight / waitlist", score: 0 },
        ],
      },
      {
        id: "fac_visitor",
        label: "Visitor parking",
        options: [
          { value: "easy", label: "Easy", score: 3 },
          { value: "limited", label: "Limited", score: 1 },
          { value: "none", label: "None", score: 0 },
        ],
      },
      {
        id: "fac_facade",
        label: "Façade & external walls (spalling, stains, cracked tiles)",
        options: QUALITY,
      },
      {
        id: "fac_ev",
        label: "EV charging",
        options: [
          { value: "yes", label: "Available", score: 3 },
          { value: "planned", label: "Planned", score: 2 },
          { value: "no", label: "None", score: 1 },
          NA,
        ],
      },
    ],
  },
  {
    id: "mgmt",
    title: "Management & Fees",
    emoji: "🧾",
    questions: [
      {
        id: "mgmt_fee",
        label: "Maintenance fee vs what you get",
        tip: "Note the monthly $ in section notes; >$400/mo needs justifying",
        options: [
          { value: "worth", label: "Good value", score: 3 },
          { value: "ok", label: "Acceptable", score: 2 },
          { value: "high", label: "Expensive", score: 0 },
        ],
      },
      {
        id: "mgmt_levy",
        label: "Special levy / major works upcoming (ask MCST or agent)",
        options: [
          { value: "none", label: "None known", score: 3 },
          { value: "planned", label: "Levy planned", score: 0 },
          { value: "recent", label: "Recently done", score: 3 },
          { value: "unsure", label: "Unsure", score: 1 },
        ],
      },
      {
        id: "mgmt_upkeep",
        label: "Estate management quality (notice boards, gardens, repairs)",
        options: QUALITY,
      },
      {
        id: "mgmt_enbloc",
        label: "En-bloc activity",
        tip: "En-bloc potential can be upside or a forced move — decide which you want",
        options: [
          { value: "none", label: "None" },
          { value: "rumoured", label: "Rumoured" },
          { value: "active", label: "Active committee" },
          { value: "failed", label: "Failed attempt before" },
        ],
      },
      {
        id: "mgmt_rules",
        label: "House rules fit you (pets, reno hours, rental policy)",
        options: [...YES_NO, NA],
      },
    ],
  },
  {
    id: "location",
    title: "Location & Connectivity",
    emoji: "📍",
    questions: [
      {
        id: "loc_mrt",
        label: "Walk to nearest MRT",
        options: [
          { value: "u5", label: "< 5 min", score: 3 },
          { value: "u10", label: "5–10 min", score: 2 },
          { value: "u15", label: "10–15 min", score: 1 },
          { value: "o15", label: "> 15 min", score: 0 },
        ],
      },
      {
        id: "loc_sheltered",
        label: "Sheltered walkway to MRT / bus",
        options: YES_NO,
      },
      { id: "loc_bus", label: "Bus connectivity", options: QUALITY },
      {
        id: "loc_food",
        label: "Food nearby (hawker, coffee shop, restaurants)",
        options: QUALITY,
      },
      {
        id: "loc_groceries",
        label: "Supermarket / mall within walking distance",
        options: QUALITY,
      },
      {
        id: "loc_schools",
        label: "Schools within 1 km (if relevant)",
        tip: "1 km radius matters for P1 registration priority",
        options: [
          { value: "target", label: "Target school in 1km", score: 3 },
          { value: "some", label: "Decent options", score: 2 },
          { value: "none", label: "None", score: 0 },
          NA,
        ],
      },
      { id: "loc_commute", label: "Commute to work / CBD", options: QUALITY },
      {
        id: "loc_masterplan",
        label: "URA Master Plan around the site",
        tip: "Check ura.gov.sg/maps — empty plots nearby = future construction / blocked view",
        options: [
          { value: "positive", label: "Upside nearby", score: 3 },
          { value: "neutral", label: "Neutral", score: 2 },
          { value: "risk", label: "Risk (new blocks/roads)", score: 0 },
          { value: "unchecked", label: "Not checked yet", score: 1 },
        ],
      },
    ],
  },
  {
    id: "financial",
    title: "Price & Deal",
    emoji: "💰",
    questions: [
      {
        id: "fin_vs_market",
        label: "Asking price vs recent transactions in the block",
        tip: "Check URA/SRX/EdgeProp caveats for the same stack & floor",
        options: [
          { value: "below", label: "Below market", score: 3 },
          { value: "at", label: "At market", score: 2 },
          { value: "above", label: "Above market", score: 0 },
          { value: "unchecked", label: "Not checked", score: 1 },
        ],
      },
      {
        id: "fin_valuation",
        label: "Bank valuation supports the price (avoid COV)",
        options: [
          { value: "match", label: "Matches", score: 3 },
          { value: "gap", label: "Gap / cash top-up", score: 0 },
          { value: "unknown", label: "Unknown", score: 1 },
        ],
      },
      {
        id: "fin_lease",
        label: "Remaining lease comfort",
        tip: "Under ~60 yrs remaining hits CPF usage & bank loan limits",
        options: [
          { value: "freehold", label: "Freehold/999", score: 3 },
          { value: "long", label: "> 80 yrs left", score: 3 },
          { value: "mid", label: "60–80 yrs", score: 2 },
          { value: "short", label: "< 60 yrs", score: 0 },
        ],
      },
      {
        id: "fin_motivation",
        label: "Seller motivation",
        options: [
          { value: "urgent", label: "Urgent sale", score: 3 },
          { value: "normal", label: "Normal", score: 2 },
          { value: "testing", label: "Testing market", score: 0 },
          { value: "unsure", label: "Unsure", score: 1 },
        ],
      },
      {
        id: "fin_tenancy",
        label: "Possession",
        options: [
          { value: "vacant", label: "Vacant possession" },
          { value: "owner", label: "Owner-occupied" },
          { value: "tenanted", label: "Tenanted" },
        ],
      },
      {
        id: "fin_yield",
        label: "Rental yield potential (if investing)",
        options: [...QUALITY, NA],
      },
    ],
  },
];

export const GENERAL_SECTION_ID = "general";

const allQuestions = SECTIONS.flatMap((s) => s.questions);
export const QUESTION_COUNT = allQuestions.length;

export function optionFor(qId: string, value: string): Option | undefined {
  const q = allQuestions.find((q) => q.id === qId);
  return q?.options.find((o) => o.value === value);
}

// ---------- User configuration ----------
// Users can hide questions, reword them, edit options/scores, add custom
// questions, and give each question an importance weight. Stored per user.

export type QuestionOverride = {
  label?: string;
  hidden?: boolean;
  weight?: number; // 0.5 minor · 1 standard · 2 important · 3 critical
  options?: Option[];
};

export type CustomQuestion = {
  id: string; // "cq_..."
  sectionId: string;
  label: string;
  options: Option[];
  weight?: number;
};

export type ChecklistConfig = {
  overrides?: Record<string, QuestionOverride>;
  custom?: CustomQuestion[];
};

export const WEIGHT_OPTIONS = [
  { value: 0.5, label: "Minor ×0.5" },
  { value: 1, label: "Standard ×1" },
  { value: 2, label: "Important ×2" },
  { value: 3, label: "Critical ×3" },
];

/** SECTIONS with user overrides applied: hidden removed, labels/options
 *  replaced, custom questions appended. Question objects carry weight. */
export type EffectiveQuestion = Question & { weight: number; custom?: boolean };
export type EffectiveSection = Omit<Section, "questions"> & { questions: EffectiveQuestion[] };

export function effectiveSections(cfg?: ChecklistConfig | null): EffectiveSection[] {
  return SECTIONS.map((s) => {
    const questions: EffectiveQuestion[] = [];
    for (const q of s.questions) {
      const ov = cfg?.overrides?.[q.id];
      if (ov?.hidden) continue;
      questions.push({
        ...q,
        label: ov?.label ?? q.label,
        options: ov?.options ?? q.options,
        weight: ov?.weight ?? 1,
      });
    }
    for (const cq of cfg?.custom ?? []) {
      if (cq.sectionId !== s.id) continue;
      questions.push({
        id: cq.id,
        label: cq.label,
        options: cq.options,
        weight: cq.weight ?? 1,
        custom: true,
      });
    }
    return { id: s.id, title: s.title, emoji: s.emoji, questions };
  });
}

/** Weighted section score 0-100. Unanswered scored questions count at the
 *  midpoint of their scale; questions answered with an unscored option
 *  (N/A, informational) are excluded. Null when the section has no scorable
 *  questions. */
export function sectionScore(
  section: Section | EffectiveSection,
  answers: Record<string, string>
): number | null {
  let got = 0;
  let max = 0;
  for (const q of section.questions) {
    const scores = q.options.map((o) => o.score).filter((s): s is number => s !== undefined);
    if (!scores.length) continue; // informational question
    const maxOpt = Math.max(...scores);
    if (maxOpt <= 0) continue;
    const w = (q as EffectiveQuestion).weight ?? 1;
    const v = answers[q.id];
    if (v) {
      const opt = q.options.find((o) => o.value === v);
      if (opt?.score === undefined) continue; // N/A → not applicable, excluded
      got += opt.score * w;
      max += maxOpt * w;
    } else {
      got += (maxOpt / 2) * w; // unanswered → neutral midpoint
      max += maxOpt * w;
    }
  }
  if (max === 0) return null;
  return Math.round((got / max) * 100);
}

/** Overall score: average of section scores. Null until at least one
 *  question anywhere has been answered (so empty viewings show "—", not 50). */
export function overallScore(
  answers: Record<string, string>,
  cfg?: ChecklistConfig | null
): number | null {
  const sections = effectiveSections(cfg);
  const anyAnswered = sections.some((s) => s.questions.some((q) => answers[q.id]));
  if (!anyAnswered) return null;
  const scores = sections
    .map((s) => sectionScore(s, answers))
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** How many questions in a section are answered. */
export function sectionProgress(
  section: Section,
  answers: Record<string, string>
): { done: number; total: number } {
  const done = section.questions.filter((q) => answers[q.id]).length;
  return { done, total: section.questions.length };
}

export function scoreColor(score: number | null): string {
  if (score === null) return "var(--muted)";
  if (score >= 75) return "var(--score-high)";
  if (score >= 50) return "var(--score-mid)";
  return "var(--score-low)";
}
