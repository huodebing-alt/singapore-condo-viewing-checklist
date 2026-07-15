"use client";

// Leaflet map of viewings with OneMap (SLA) tiles. Score-badge pins;
// tapping a pin opens the viewing. Coordinates are geocoded once via
// OneMap and cached on the viewing record.

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
    for (const v of viewings) {
      if (v.lat === undefined || v.lng === undefined) continue;
      pts.push([v.lat, v.lng]);
      const s = scores[v.id] ?? null;
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${s === null ? "#7d8f84" : scoreColor(s)};color:#fff;width:36px;height:36px;border-radius:50% 50% 50% 4px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;transform:rotate(0deg)">${s ?? "—"}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 34],
      });
      const marker = L.marker([v.lat, v.lng], { icon }).addTo(layer);
      marker.bindPopup(
        `<strong>${v.condoName}</strong><br>${[v.block && `Blk ${v.block}`, v.unit].filter(Boolean).join(" ")}<br>${fmtPrice(v.askingPrice)}${v.sizeSqft ? ` · ${v.sizeSqft} sqft` : ""}<br><a href="/viewing/${v.id}">Open viewing →</a>`
      );
      marker.on("popupopen", () => {
        const a = document.querySelector(`.leaflet-popup a[href="/viewing/${v.id}"]`);
        a?.addEventListener("click", (e) => {
          e.preventDefault();
          router.push(`/viewing/${v.id}`);
        });
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
