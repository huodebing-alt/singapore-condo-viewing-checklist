import { del, list } from "@vercel/blob";
import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { id } = await ctx.params;
  const path = `users/${uid}/viewings/${id}.json`;
  const { blobs } = await list({ prefix: path });
  const blob = blobs.find((b) => b.pathname === path);
  if (!blob) return new Response("not found", { status: 404 });
  const res = await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`);
  return Response.json(await res.json());
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { id } = await ctx.params;
  await del(`users/${uid}/viewings/${id}.json`).catch(() => {});
  const { blobs } = await list({ prefix: `users/${uid}/photos/${id}/` });
  if (blobs.length) await del(blobs.map((b) => b.url));
  return Response.json({ ok: true });
}
