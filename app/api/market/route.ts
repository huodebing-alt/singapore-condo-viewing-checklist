// Market query: 12-month transactions for the subject project (similar size)
// plus nearby same-district projects ranked by activity.

import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";
import { loadCache, median, normKey, refreshCache, type MarketTx } from "@/lib/market-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // first call may refresh the URA cache inline

const STALE_MS = 8 * 86400_000;

export async function GET(req: Request) {
  if (!cloudConfigured()) return noStore();
  if (!getUid(req)) return unauthorized();

  const url = new URL(req.url);
  const project = url.searchParams.get("project") ?? "";
  const district = String(Number(url.searchParams.get("district") ?? "")) || "";
  const sqft = Number(url.searchParams.get("sqft")) || 0;
  if (!project) return new Response(JSON.stringify({ error: "project required" }), { status: 400 });

  let cache = await loadCache();
  const stale = !cache || Date.now() - new Date(cache.refreshedAt).getTime() > STALE_MS;
  if (stale) {
    if (!process.env.URA_ACCESS_KEY) {
      if (!cache) return Response.json({ error: "no-key" }, { status: 501 });
      // stale but no key to refresh — serve what we have
    } else {
      try {
        // use the returned cache directly — an immediate Blob re-read can
        // miss the fresh write (eventual consistency) and masquerade as
        // "not configured"
        cache = (await refreshCache()).cache;
      } catch (e) {
        if (!cache) {
          return Response.json(
            { error: "refresh-failed", detail: e instanceof Error ? e.message : String(e) },
            { status: 502 }
          );
        }
      }
    }
  }
  if (!cache) return Response.json({ error: "no-key" }, { status: 501 });

  const similar = (t: MarketTx) => !sqft || (t.sqft >= sqft * 0.8 && t.sqft <= sqft * 1.2);
  const psf = (t: MarketTx) => Math.round(t.price / t.sqft);

  const subjKey = normKey(project);
  const subject = cache.projects.find((p) => p.key === subjKey);
  const subjectSimilar = (subject?.tx ?? []).filter(similar).sort((a, b) => b.m.localeCompare(a.m));

  const nearby = cache.projects
    .filter((p) => district && p.d === district && p.key !== subjKey)
    .map((p) => {
      const tt = p.tx.filter(similar);
      return tt.length
        ? {
            project: p.n,
            street: p.st,
            count: tt.length,
            medianPsf: median(tt.map(psf)),
            medianPrice: median(tt.map((t) => t.price)),
            minSqft: Math.min(...tt.map((t) => t.sqft)),
            maxSqft: Math.max(...tt.map((t) => t.sqft)),
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Monthly aggregates for the chart: last 12 calendar months, zero-filled
  const months: string[] = [];
  {
    const d = new Date();
    d.setDate(1);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d);
      m.setMonth(m.getMonth() - i);
      months.push(m.toISOString().slice(0, 7));
    }
  }
  const monthly = months.map((m) => {
    const tt = subjectSimilar.filter((t) => t.m === m);
    return {
      m,
      count: tt.length,
      avgPrice: tt.length
        ? Math.round(tt.reduce((a, t) => a + t.price, 0) / tt.length)
        : null,
      avgPsf: tt.length
        ? Math.round(tt.reduce((a, t) => a + psf(t), 0) / tt.length)
        : null,
    };
  });

  return Response.json({
    refreshedAt: cache.refreshedAt,
    subject: subject
      ? {
          name: subject.n,
          street: subject.st,
          totalTx: subject.tx.length,
          similarCount: subjectSimilar.length,
          medianPsf: median(subjectSimilar.map(psf)),
          medianPrice: median(subjectSimilar.map((t) => t.price)),
          tx: subjectSimilar.slice(0, 40),
          monthly,
        }
      : null,
    nearby,
  });
}
