import { list, put } from "@vercel/blob";
import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { blobs } = await list({ prefix: `users/${uid}/viewings/` });
  const viewings = await Promise.all(
    blobs.map(async (b) => {
      // cache-bust with the blob version so edits are visible immediately
      const res = await fetch(`${b.url}?v=${new Date(b.uploadedAt).getTime()}`);
      if (!res.ok) return null;
      return res.json();
    })
  );
  return Response.json(viewings.filter(Boolean));
}

export async function POST(req: Request) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const viewing = await req.json();
  if (!viewing?.id || typeof viewing.id !== "string" || /[/\\]/.test(viewing.id)) {
    return new Response("invalid viewing", { status: 400 });
  }
  await put(`users/${uid}/viewings/${viewing.id}.json`, JSON.stringify(viewing), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return Response.json({ ok: true });
}
