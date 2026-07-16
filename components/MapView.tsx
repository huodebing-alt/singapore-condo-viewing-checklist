"use client";

// Leaflet map of viewings with OneMap (SLA) tiles. Viewings of the same
// project are merged into one bubble showing the best score (+ unit count);
// tapping it opens a unit list to jump to a specific viewing.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import type { Viewing } from "@/lib/types";
import { fmtPrice } from "@/lib/types";
import { scoreColor } from "@/lib/checklist";

export default function MapView({
  viewings,
  scores,
}: {
  viewings: (Viewing & { lat?: number; lng?: number })[];
  scores: Record<string, number | null>;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: true }).setView(
      [1.3521, 103.8198],
      11
    );
    L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
      maxZoom: 19,
      minZoom: 11,
      attribution:
        '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:14px;vertical-align:middle"> OneMap © SLA',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const pts: [number, number][] = [];

    // One bubble per project: best score wins, units listed in the popup
    const groups = new Map<string, (Viewing & { lat?: number; lng?: number })[]>();
    for (const v of viewings) {
      if (v.lat === undefined || v.lng === undefined) continue;
      const key = v.condoName.trim().toUpperCase() || `${v.lat},${v.lng}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(v);
    }

    for (const members of groups.values()) {
      const anchor = members[0];
      pts.push([anchor.lat!, anchor.lng!]);
      const best = members.reduce<number | null>((acc, v) => {
        const s = scores[v.id] ?? null;
        return s !== null && (acc === null || s > acc) ? s : acc;
      }, null);
      const countBadge =
        members.length > 1
          ? `<div style="position:absolute;top:-6px;right:-8px;background:#17271d;color:#fff;border-radius:999px;min-width:17px;height:17px;font-size:10.5px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:1.5px solid #fff">${members.length}</div>`
          : "";
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;background:${best === null ? "#7d8f84" : scoreColor(best)};color:#fff;width:38px;height:38px;border-radius:50% 50% 50% 4px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff">${best ?? "—"}${countBadge}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 36],
      });
      const marker = L.marker([anchor.lat!, anchor.lng!], { icon }).addTo(layer);

      const unitRows = members
        .map((v) => {
          const s = scores[v.id] ?? null;
          const label = [v.block && `Blk ${v.block}`, v.unit].filter(Boolean).join(" ") || "Unit";
          const meta = [fmtPrice(v.askingPrice), v.sizeSqft ? `${v.sizeSqft} sqft` : ""]
            .filter((x) => x && x !== "—")
            .join(" · ");
          return `<a href="/viewing/${v.id}" data-vid="${v.id}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #edf3ee;text-decoration:none;color:#17271d">
            <span style="background:${s === null ? "#7d8f84" : scoreColor(s)};color:#fff;border-radius:999px;min-width:30px;text-align:center;font-weight:700;font-size:11.5px;padding:2px 4px">${s ?? "—"}</span>
            <span style="flex:1"><strong>${label}</strong>${meta ? `<br><span style="font-size:11.5px;color:#66796c">${meta}</span>` : ""}</span>
            <span style="color:#2f8f60">›</span>
          </a>`;
        })
        .join("");
      marker.bindPopup(
        `<div style="min-width:190px;max-height:240px;overflow-y:auto"><strong style="font-size:13.5px">${anchor.condoName || "Unnamed"}</strong>
         <div style="font-size:11px;color:#66796c;margin-bottom:2px">${members.length} viewing${members.length > 1 ? "s" : ""} — tap a unit</div>${unitRows}</div>`,
        { maxWidth: 260 }
      );
      marker.on("popupopen", (e) => {
        e.popup
          .getElement()
          ?.querySelectorAll<HTMLAnchorElement>("a[data-vid]")
          .forEach((a) =>
            a.addEventListener("click", (ev) => {
              ev.preventDefault();
              router.push(`/viewing/${a.dataset.vid}`);
            })
          );
      });
    }
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15 });
    return () => {
      layer.remove();
    };
  }, [viewings, scores, router]);

  return (
    <div
      ref={mapEl}
      style={{
        height: "62vh",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "var(--shadow)",
        margin: "12px 0",
        zIndex: 0,
      }}
    />
  );
}
