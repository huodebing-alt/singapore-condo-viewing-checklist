// Small per-user JSON documents (checklist config, purchase plan).

import { list, put } from "@vercel/blob";
import { cloudConfigured, getUid, noStore, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["config", "purchase"]);

type Params = { params: Promise<{ key: string }> };

export async function GET(req: Request, ctx: Params) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { key } = await ctx.params;
  if (!ALLOWED.has(key)) return new Response("bad key", { status: 400 });
  const path = `users/${uid}/docs/${key}.json`;
  const { blobs } = await list({ prefix: path });
  const blob = blobs.find((b) => b.pathname === path);
  if (!blob) return new Response("not found", { status: 404 });
  const res = await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`);
  return Response.json(await res.json());
}

export async function POST(req: Request, ctx: Params) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { key } = await ctx.params;
  if (!ALLOWED.has(key)) return new Response("bad key", { status: 400 });
  const body = await req.text();
  if (body.length > 512 * 1024) return new Response("too large", { status: 413 });
  await put(`users/${uid}/docs/${key}.json`, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return Response.json({ ok: true });
}
