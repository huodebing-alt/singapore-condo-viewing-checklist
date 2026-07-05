// One-time migration: move pre-auth blobs (viewings/*, photos/*) into a
// user's namespace (users/<uid>/...), rewriting photo URLs inside each
// viewing JSON. Usage: node scripts/migrate-to-user.mjs u_lorin
import { copy, del, list } from "@vercel/blob";
import { readFileSync } from "node:fs";

// Load BLOB_READ_WRITE_TOKEN from .env.local
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="(.*)"$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const uid = process.argv[2];
if (!uid) throw new Error("usage: node scripts/migrate-to-user.mjs <uid>");

const { blobs: photoBlobs } = await list({ prefix: "photos/", limit: 1000 });
const urlMap = new Map(); // old url -> new url
for (const b of photoBlobs) {
  const dest = `users/${uid}/${b.pathname}`;
  const copied = await copy(b.url, dest, { access: "public", addRandomSuffix: false });
  urlMap.set(b.url, copied.url);
  console.log("photo:", b.pathname, "->", dest);
}

const { blobs: viewingBlobs } = await list({ prefix: "viewings/", limit: 1000 });
for (const b of viewingBlobs) {
  const res = await fetch(`${b.url}?v=${Date.now()}`);
  const viewing = await res.json();
  for (const p of viewing.photos ?? []) {
    if (p.url && urlMap.has(p.url)) p.url = urlMap.get(p.url);
  }
  const { put } = await import("@vercel/blob");
  await put(`users/${uid}/${b.pathname}`, JSON.stringify(viewing), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  console.log("viewing:", b.pathname, `(${viewing.condoName ?? "?"})`);
}

// Delete originals only after everything copied
const oldUrls = [...photoBlobs.map((b) => b.url), ...viewingBlobs.map((b) => b.url)];
if (oldUrls.length) await del(oldUrls);
console.log(`Migrated ${viewingBlobs.length} viewings + ${photoBlobs.length} photos to ${uid}; removed originals.`);
