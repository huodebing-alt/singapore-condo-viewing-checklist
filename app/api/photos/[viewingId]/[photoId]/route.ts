import { del, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const noStore = () =>
  new Response(JSON.stringify({ error: "Blob storage not configured" }), { status: 503 });

type Params = { params: Promise<{ viewingId: string; photoId: string }> };

export async function PUT(req: Request, ctx: Params) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return noStore();
  const { viewingId, photoId } = await ctx.params;
  const body = await req.arrayBuffer();
  if (body.byteLength > 8 * 1024 * 1024) return new Response("too large", { status: 413 });
  const blob = await put(`photos/${viewingId}/${photoId}.jpg`, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/jpeg",
  });
  return Response.json({ url: blob.url });
}

export async function DELETE(_req: Request, ctx: Params) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return noStore();
  const { viewingId, photoId } = await ctx.params;
  await del(`photos/${viewingId}/${photoId}.jpg`).catch(() => {});
  return Response.json({ ok: true });
}
