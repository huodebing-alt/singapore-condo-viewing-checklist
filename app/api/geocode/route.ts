// Geocode a condo name via Singapore's OneMap search API (public, free).
// Proxied server-side to avoid CORS surprises; results are cached onto the
// viewing record client-side so each project geocodes once.

import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (cloudConfigured() && !getUid(req)) return unauthorized();
  if (!cloudConfigured()) {
    // device-only deployments can still geocode — no auth exists to check
  }
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return new Response("q required", { status: 400 });
  try {
    const res = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
      { headers: { "User-Agent": "condoscout-sg" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return Response.json({ found: false });
    const j = await res.json();
    const hit = j.results?.[0];
    if (!hit) return Response.json({ found: false });
    return Response.json({
      found: true,
      lat: Number(hit.LATITUDE),
      lng: Number(hit.LONGITUDE),
      address: hit.ADDRESS,
    });
  } catch {
    return Response.json({ found: false });
  }
}
