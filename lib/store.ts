// Data layer. Cloud-first (API routes backed by Vercel Blob); falls back to
// on-device IndexedDB when the deployment has no Blob store configured
// (or when running without network). The UI shows which mode is active.

import type { Viewing } from "./types";
import { idb } from "./idb";

let cloudAvailable: boolean | null = null;

export async function isCloud(): Promise<boolean> {
  if (cloudAvailable !== null) return cloudAvailable;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const j = await res.json();
    cloudAvailable = !!j.cloud;
  } catch {
    cloudAvailable = false;
  }
  return cloudAvailable;
}

export async function listViewings(): Promise<Viewing[]> {
  if (await isCloud()) {
    const res = await fetch("/api/viewings", { cache: "no-store" });
    if (res.ok) return res.json();
  }
  return idb.getAll<Viewing>("viewings");
}

export async function getViewing(id: string): Promise<Viewing | undefined> {
  if (await isCloud()) {
    const res = await fetch(`/api/viewings/${id}`, { cache: "no-store" });
    if (res.ok) return res.json();
    if (res.status === 404) return undefined;
  }
  return idb.get<Viewing>("viewings", id);
}

export async function saveViewing(v: Viewing): Promise<void> {
  v.updatedAt = new Date().toISOString();
  if (await isCloud()) {
    const res = await fetch("/api/viewings", {
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
    const res = await fetch(`/api/viewings/${v.id}`, { method: "DELETE" });
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
    const res = await fetch(`/api/photos/${viewingId}/${photoId}`, {
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
    await fetch(`/api/photos/${viewingId}/${photo.id}`, { method: "DELETE" }).catch(() => {});
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

/** Push device-stored viewings + photos to the cloud, then clear local copies. */
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
