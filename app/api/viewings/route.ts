import { list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const noStore = () =>
  new Response(JSON.stringify({ error: "Blob storage not configured" }), { status: 503 });

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return noStore();
  const { blobs } = await list({ prefix: "viewings/" });
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
  if (!process.env.BLOB_READ_WRITE_TOKEN) return noStore();
  const viewing = await req.json();
  if (!viewing?.id || typeof viewing.id !== "string") {
    return new Response("invalid viewing", { status: 400 });
  }
  await put(`viewings/${viewing.id}.json`, JSON.stringify(viewing), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return Response.json({ ok: true });
}
