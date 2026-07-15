export type PhotoMeta = {
  id: string;
  sectionId: string; // checklist section id, or "general"
  takenAt: string;
  url?: string; // set when stored in cloud blob storage
};

export type AgentInfo = {
  name: string;
  agency: string;
  phone: string;
  ceaNo: string;
  notes: string;
};

export type ViewingStatus =
  | "to-view"
  | "viewed"
  | "shortlisted"
  | "rejected"
  | "offer";

export type Viewing = {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Property identity
  condoName: string;
  district?: number;
  area?: string;
  tenure?: string;
  topYear?: number;
  block: string;
  unit: string;
  /** Linked PropertyGuru listing URL */
  pgUrl?: string;

  /** Geocoded location (OneMap), cached after first map render */
  lat?: number;
  lng?: number;

  // Auto-populated metrics snapshot from the condo database (editable-free,
  // indicative data: nearest MRT, facilities, schools, yield)
  condoMeta?: CondoMeta;

  // Unit facts
  viewingDate: string;
  floorBand: string; // low | mid | high | penthouse
  sizeSqft?: number;
  /** Which measurement convention sizeSqft was listed under. */
  areaBasis?: AreaBasis;
  /** Divisor to convert a pre-harmonization area to its post-2023 equivalent
   *  (AC ledge ~4-5%, more with voids/planters). Default 1.07, varies by project. */
  harmFactor?: number;
  bedrooms?: number;
  bathrooms?: number;
  askingPrice?: number;
  facing?: string;
  availability?: string;

  status: ViewingStatus;

  agent: AgentInfo;

  // Checklist
  answers: Record<string, string>; // questionId -> option value
  sectionNotes: Record<string, string>; // sectionId -> free text
  generalNotes: string;

  photos: PhotoMeta[];
};

export type CondoMeta = {
  mrt?: string;
  mrtWalkMins?: number;
  facilities?: string[];
  schools1km?: string[];
  intlSchools?: string[];
  rentalYieldPct?: number;
  maintFeeBand?: "low" | "medium" | "high";
  enbloc?: "none" | "rumoured" | "active" | "failed";
  carpark?: "ample" | "ok" | "tight";
  evCharging?: "yes" | "planned" | "no";
};

export type CondoEntry = CondoMeta & {
  name: string;
  district: number;
  area: string;
  tenure: string;
  top: number;
};

/** 'pre2023' = strata area includes AC ledge/voids (pre GFA-harmonization);
 *  'post2023' = harmonized area (plans submitted after 1 Jun 2023). */
export type AreaBasis = "pre2023" | "post2023";

export const STATUS_LABELS: Record<ViewingStatus, string> = {
  "to-view": "To view",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  offer: "Offer made",
};

export const FLOOR_BANDS = [
  { value: "low", label: "Low floor" },
  { value: "mid", label: "Mid floor" },
  { value: "high", label: "High floor" },
  { value: "penthouse", label: "Penthouse" },
];

export const FACINGS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];

export function emptyViewing(): Viewing {
  const now = new Date().toISOString();
  return {
    id: `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    condoName: "",
    block: "",
    unit: "",
    viewingDate: now.slice(0, 10),
    floorBand: "",
    status: "viewed",
    agent: { name: "", agency: "", phone: "", ceaNo: "", notes: "" },
    answers: {},
    sectionNotes: {},
    generalNotes: "",
    photos: [],
  };
}

export function fmtPrice(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

export function psf(v: Viewing): number | undefined {
  if (!v.askingPrice || !v.sizeSqft) return undefined;
  return Math.round(v.askingPrice / v.sizeSqft);
}

/** Size converted to the post-2023 harmonized convention (excl. AC ledge). */
export function harmonizedSqft(v: Viewing): number | undefined {
  if (!v.sizeSqft) return undefined;
  if (v.areaBasis === "post2023") return v.sizeSqft;
  return Math.round(v.sizeSqft / (v.harmFactor ?? 1.07));
}

/** PSF on harmonized area — the apples-to-apples number across old and new projects. */
export function harmonizedPsf(v: Viewing): number | undefined {
  const size = harmonizedSqft(v);
  if (!v.askingPrice || !size) return undefined;
  return Math.round(v.askingPrice / size);
}

/** Sensible default basis: post-harmonization projects only started completing ~2027. */
export function defaultAreaBasis(topYear?: number): AreaBasis {
  return topYear && topYear >= 2027 ? "post2023" : "pre2023";
}
