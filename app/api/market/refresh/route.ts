// Refresh the URA transaction cache. Called weekly by Vercel Cron
// (Authorization: Bearer CRON_SECRET) or manually by a signed-in user.

import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";
import { refreshCache } from "@/lib/market-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cloudConfigured()) return noStore();
  const isCron =
    !!process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron && !getUid(req)) return unauthorized();
  if (!process.env.URA_ACCESS_KEY) {
    return Response.json({ error: "no-key" }, { status: 501 });
  }
  try {
    const { projects, tx } = await refreshCache();
    return Response.json({ ok: true, projects, tx });
  } catch (e) {
    return Response.json(
      { error: "refresh-failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
