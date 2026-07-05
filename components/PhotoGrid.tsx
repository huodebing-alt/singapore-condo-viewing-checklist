"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoMeta } from "@/lib/types";
import { fileToJpegDataUrl } from "@/lib/image";
import { deletePhoto, photoSrc, savePhoto } from "@/lib/store";

export default function PhotoGrid({
  viewingId,
  sectionId,
  photos,
  onChange,
}: {
  viewingId: string;
  sectionId: string;
  photos: PhotoMeta[];
  onChange: (photos: PhotoMeta[]) => void;
}) {
  const mine = photos.filter((p) => p.sectionId === sectionId);
  const [srcs, setSrcs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const entries: Record<string, string> = {};
      for (const p of mine) {
        if (srcs[p.id]) continue;
        const src = await photoSrc(p);
        if (src) entries[p.id] = src;
      }
      if (live && Object.keys(entries).length) setSrcs((s) => ({ ...s, ...entries }));
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: PhotoMeta[] = [];
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToJpegDataUrl(file);
        const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const url = await savePhoto(viewingId, id, dataUrl);
        added.push({ id, sectionId, takenAt: new Date().toISOString(), url });
        setSrcs((s) => ({ ...s, [id]: url ?? dataUrl }));
      }
      onChange([...photos, ...added]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(p: PhotoMeta) {
    await deletePhoto(viewingId, p);
    onChange(photos.filter((x) => x.id !== p.id));
  }

  return (
    <div className="photogrid">
      {mine.map((p) => (
        <div className="ph" key={p.id}>
          {srcs[p.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={srcs[p.id]} alt="viewing photo" loading="lazy" />
          ) : null}
          <button type="button" className="del" onClick={() => remove(p)} aria-label="Delete photo">
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="addphoto"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Add photo"
      >
        {busy ? "…" : "📷"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
