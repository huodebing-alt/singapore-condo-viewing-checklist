import { del, put } from "@vercel/blob";
import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ viewingId: string; photoId: string }> };

export async function PUT(req: Request, ctx: Params) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { viewingId, photoId } = await ctx.params;
  if (/[/\\]/.test(viewingId) || /[/\\]/.test(photoId)) {
    return new Response("invalid id", { status: 400 });
  }
  const body = await req.arrayBuffer();
  if (body.byteLength > 8 * 1024 * 1024) return new Response("too large", { status: 413 });
  const blob = await put(`users/${uid}/photos/${viewingId}/${photoId}.jpg`, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/jpeg",
  });
  return Response.json({ url: blob.url });
}

export async function DELETE(req: Request, ctx: Params) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { viewingId, photoId } = await ctx.params;
  await del(`users/${uid}/photos/${viewingId}/${photoId}.jpg`).catch(() => {});
  return Response.json({ ok: true });
}
