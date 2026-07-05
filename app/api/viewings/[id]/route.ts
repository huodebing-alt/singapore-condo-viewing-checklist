import { del, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const noStore = () =>
  new Response(JSON.stringify({ error: "Blob storage not configured" }), { status: 503 });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return noStore();
  const { id } = await ctx.params;
  const { blobs } = await list({ prefix: `viewings/${id}.json` });
  const blob = blobs.find((b) => b.pathname === `viewings/${id}.json`);
  if (!blob) return new Response("not found", { status: 404 });
  const res = await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`);
  return Response.json(await res.json());
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return noStore();
  const { id } = await ctx.params;
  await del(`viewings/${id}.json`).catch(() => {});
  const { blobs } = await list({ prefix: `photos/${id}/` });
  if (blobs.length) await del(blobs.map((b) => b.url));
  return Response.json({ ok: true });
}
