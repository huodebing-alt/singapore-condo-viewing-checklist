// Best-effort PropertyGuru listing reader. PropertyGuru has no public API
// and actively blocks bots, so this parses whatever structured data
// (JSON-LD / OpenGraph / URL slug) a plain fetch can reach and reports
// honestly when it is blocked. The listing link itself is always kept.

import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

function slugInfo(url: string): { projectName?: string } {
  // e.g. /listing/for-sale-the-interlace-25264627
  const m = url.match(/listing\/(?:for-sale-)?([a-z0-9-]+?)(?:-\d+)?(?:[/?#]|$)/i);
  if (!m) return {};
  const name = m[1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return name.length > 2 ? { projectName: name } : {};
}

export async function GET(req: Request) {
  if (!cloudConfigured()) return noStore();
  if (!getUid(req)) return unauthorized();
  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!/^https:\/\/(www\.)?propertyguru\.com\.sg\//i.test(url)) {
    return Response.json({ ok: false, error: "not a PropertyGuru URL" }, { status: 400 });
  }

  const out: Record<string, unknown> = { ok: true, ...slugInfo(url) };
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-SG,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 403 || res.status === 429) {
      return Response.json({ ...out, blocked: true });
    }
    if (!res.ok) return Response.json(out);
    const html = await res.text();

    // JSON-LD blocks
    for (const m of html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    )) {
      try {
        const data = JSON.parse(m[1]);
        for (const node of Array.isArray(data) ? data : [data]) {
          const offer = node.offers ?? node;
          const price = Number(offer?.price ?? offer?.priceSpecification?.price);
          if (price > 10000) out.price = price;
          const floor = node.floorSize?.value ?? node.floorSize;
          const sqft = Number(typeof floor === "object" ? floor?.value : floor);
          if (sqft > 100 && sqft < 30000) out.sqft = Math.round(sqft);
          const beds = Number(node.numberOfRooms ?? node.numberOfBedrooms);
          if (beds >= 1 && beds <= 10) out.beds = beds;
          const baths = Number(node.numberOfBathroomsTotal);
          if (baths >= 1 && baths <= 10) out.baths = baths;
          if (node.name && typeof node.name === "string" && !out.projectName) {
            out.projectName = node.name;
          }
        }
      } catch {
        /* skip malformed block */
      }
    }

    // Fallbacks from meta/text
    if (!out.price) {
      const pm = html.match(/"price"\s*:\s*"?(\d{6,9})/);
      if (pm) out.price = Number(pm[1]);
    }
    if (!out.sqft) {
      const sm = html.match(/([\d,]{3,6})\s*sqft/i);
      if (sm) {
        const v = Number(sm[1].replace(/,/g, ""));
        if (v > 100 && v < 30000) out.sqft = v;
      }
    }
    if (!out.district) {
      const dm = html.match(/\(D(\d{1,2})\)/);
      if (dm) out.district = Number(dm[1]);
    }
    return Response.json(out);
  } catch {
    return Response.json({ ...out, blocked: true });
  }
}
