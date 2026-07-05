// Data layer. Cloud-first (API routes backed by Vercel Blob, scoped to the
// signed-in user); falls back to on-device IndexedDB when the deployment has
// no Blob store configured. When cloud storage exists but the visitor is not
// signed in, we redirect to /login instead of touching any data.

import type { Viewing } from "./types";
import { idb } from "./idb";

type Health = { cloud: boolean; authed: boolean };
let health: Health | null = null;

async function getHealth(): Promise<Health> {
  if (health) return health;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    health = (await res.json()) as Health;
  } catch {
    health = { cloud: false, authed: false };
  }
  return health;
}

function toLogin(): never {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
  throw new Error("not signed in");
}

/** True when the deployment has cloud storage AND the user is signed in. */
export async function isCloud(): Promise<boolean> {
  const h = await getHealth();
  if (h.cloud && !h.authed) toLogin();
  return h.cloud;
}

/** Cloud configured at all (regardless of auth) — for banners. */
export async function cloudConfigured(): Promise<boolean> {
  return (await getHealth()).cloud;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init);
  if (res.status === 401) {
    health = null;
    toLogin();
  }
  return res;
}

export async function listViewings(): Promise<Viewing[]> {
  if (await isCloud()) {
    const res = await api("/api/viewings", { cache: "no-store" });
    if (res.ok) return res.json();
  }
  return idb.getAll<Viewing>("viewings");
}

export async function getViewing(id: string): Promise<Viewing | undefined> {
  if (await isCloud()) {
    const res = await api(`/api/viewings/${id}`, { cache: "no-store" });
    if (res.ok) return res.json();
    if (res.status === 404) return undefined;
  }
  return idb.get<Viewing>("viewings", id);
}

export async function saveViewing(v: Viewing): Promise<void> {
  v.updatedAt = new Date().toISOString();
  if (await isCloud()) {
    const res = await api("/api/viewings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) return;
  }
  await idb.put("viewings", v);
}

export async function deleteViewing(v: Viewing): Promise<void> {
  if (await isCloud()) {
    const res = await api(`/api/viewings/${v.id}`, { method: "DELETE" });
    if (res.ok) return;
  }
  await idb.del("viewings", v.id);
  for (const p of v.photos) {
    await idb.del("photos", p.id).catch(() => {});
  }
}

/** Store a photo (JPEG data URL). Returns a cloud URL when stored remotely. */
export async function savePhoto(
  viewingId: string,
  photoId: string,
  dataUrl: string
): Promise<string | undefined> {
  if (await isCloud()) {
    const blob = await (await fetch(dataUrl)).blob();
    const res = await api(`/api/photos/${viewingId}/${photoId}`, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    if (res.ok) {
      const j = await res.json();
      return j.url as string;
    }
  }
  await idb.put("photos", dataUrl, photoId);
  return undefined;
}

/** Resolve a photo to a displayable src. */
export async function photoSrc(photo: {
  id: string;
  url?: string;
}): Promise<string | undefined> {
  if (photo.url) return photo.url;
  return idb.get<string>("photos", photo.id);
}

export async function deletePhoto(
  viewingId: string,
  photo: { id: string; url?: string }
): Promise<void> {
  if (photo.url && (await isCloud())) {
    await api(`/api/photos/${viewingId}/${photo.id}`, { method: "DELETE" }).catch(() => {});
  }
  await idb.del("photos", photo.id).catch(() => {});
}

/** Count viewings stored only on this device (for the migrate-to-cloud banner). */
export async function localViewings(): Promise<Viewing[]> {
  try {
    return await idb.getAll<Viewing>("viewings");
  } catch {
    return [];
  }
}

/** Push device-stored viewings + photos to the signed-in cloud account. */
export async function migrateLocalToCloud(): Promise<number> {
  if (!(await isCloud())) return 0;
  const locals = await localViewings();
  for (const v of locals) {
    for (const p of v.photos) {
      if (p.url) continue;
      const dataUrl = await idb.get<string>("photos", p.id);
      if (dataUrl) {
        const url = await savePhoto(v.id, p.id, dataUrl);
        if (url) p.url = url;
      }
    }
    await saveViewing(v);
    await idb.del("viewings", v.id);
    for (const p of v.photos) await idb.del("photos", p.id).catch(() => {});
  }
  return locals.length;
}
