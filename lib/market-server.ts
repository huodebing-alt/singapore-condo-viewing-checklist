// URA private-residential transaction data pipeline.
// Fetches the official URA Data Service (5 years of caveats, 4 district
// batches), keeps the last 12 months of condo/apartment/EC transactions in a
// compact Blob cache, and answers per-project + nearby queries from it.
// Requires URA_ACCESS_KEY (free registration at https://eservice.ura.gov.sg/maps/api/).

import { list, put } from "@vercel/blob";

const CACHE_PATH = "cache/market-12m.json";
const URA_BASE = "https://eservice.ura.gov.sg/uraDataService";

export type MarketTx = {
  m: string; // contract month "2026-03"
  sqft: number;
  fl: string; // floor range e.g. "06-10"
  price: number;
  sale: "New" | "Sub" | "Resale";
};

export type MarketProject = {
  n: string; // project name as URA lists it
  key: string; // normalized match key
  st: string; // street
  d: string; // district, "4"
  tx: MarketTx[];
};

export type MarketCache = { refreshedAt: string; projects: MarketProject[] };

export const normKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

const KEEP_TYPES = /condominium|apartment/i; // includes "Executive Condominium"

async function fetchToken(accessKey: string): Promise<string> {
  const res = await fetch(`${URA_BASE}/insertNewToken/v1`, {
    headers: { AccessKey: accessKey, "User-Agent": "condoscout-sg" },
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.Result) {
    throw new Error(`URA token request failed (${res.status}): ${JSON.stringify(j).slice(0, 200)}`);
  }
  return j.Result as string;
}

/** URA contractDate is MMYY, e.g. "0326" = March 2026. */
function contractMonth(cd: string): string | null {
  if (!/^\d{4}$/.test(cd)) return null;
  return `20${cd.slice(2)}-${cd.slice(0, 2)}`;
}

/** Pull all 4 batches from URA, keep 12 months, write the Blob cache.
 *  Returns the fresh cache directly — callers must NOT re-read it from Blob
 *  immediately (listing is eventually consistent and may miss the write). */
export async function refreshCache(): Promise<{
  cache: MarketCache;
  projects: number;
  tx: number;
}> {
  const accessKey = process.env.URA_ACCESS_KEY;
  if (!accessKey) throw new Error("URA_ACCESS_KEY not configured");
  const token = await fetchToken(accessKey);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffKey = cutoff.toISOString().slice(0, 7);

  const map = new Map<string, MarketProject>();
  let txCount = 0;

  for (let batch = 1; batch <= 4; batch++) {
    const res = await fetch(`${URA_BASE}/invokeUraDS/v1?service=PMI_Resi_Transaction&batch=${batch}`, {
      headers: { AccessKey: accessKey, Token: token, "User-Agent": "condoscout-sg" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`URA batch ${batch} failed: HTTP ${res.status}`);
    const j = await res.json();
    if (j.Status && !/success/i.test(String(j.Status))) {
      throw new Error(`URA batch ${batch}: ${JSON.stringify(j).slice(0, 200)}`);
    }
    for (const p of j.Result ?? []) {
      let district = "";
      const txs: MarketTx[] = [];
      for (const t of p.transaction ?? []) {
        if (t.propertyType && !KEEP_TYPES.test(String(t.propertyType))) continue;
        const m = contractMonth(String(t.contractDate ?? ""));
        if (!m || m < cutoffKey) continue;
        const sqm = parseFloat(String(t.area));
        const price = Number(t.price);
        if (!sqm || !price) continue;
        if ((Number(t.noOfUnits) || 1) > 1) continue; // skip bulk deals
        if (!district && t.district) district = String(Number(t.district));
        txs.push({
          m,
          sqft: Math.round(sqm * 10.7639),
          fl: String(t.floorRange ?? "-"),
          price,
          sale: String(t.typeOfSale) === "1" ? "New" : String(t.typeOfSale) === "2" ? "Sub" : "Resale",
        });
      }
      if (!txs.length) continue;
      const key = normKey(String(p.project ?? ""));
      if (!key) continue;
      let mp = map.get(key);
      if (!mp) {
        mp = { n: String(p.project), key, st: String(p.street ?? ""), d: district, tx: [] };
        map.set(key, mp);
      }
      if (!mp.d && district) mp.d = district;
      mp.tx.push(...txs);
      txCount += txs.length;
    }
  }

  const cache: MarketCache = { refreshedAt: new Date().toISOString(), projects: [...map.values()] };
  await put(CACHE_PATH, JSON.stringify(cache), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return { cache, projects: map.size, tx: txCount };
}

export async function loadCache(): Promise<MarketCache | null> {
  const { blobs } = await list({ prefix: CACHE_PATH });
  const blob = blobs.find((b) => b.pathname === CACHE_PATH);
  if (!blob) return null;
  const res = await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`);
  if (!res.ok) return null;
  return res.json();
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
