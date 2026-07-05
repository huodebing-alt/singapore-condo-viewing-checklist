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

  // Unit facts
  viewingDate: string;
  floorBand: string; // low | mid | high | penthouse
  sizeSqft?: number;
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

export type CondoEntry = {
  name: string;
  district: number;
  area: string;
  tenure: string;
  top: number;
};

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
