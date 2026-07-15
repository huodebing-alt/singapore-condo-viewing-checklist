"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import TopBar from "@/components/TopBar";

const MapView = dynamicImport(() => import("@/components/MapView"), { ssr: false });
import ScoreBadge from "@/components/ScoreBadge";
import { overallScore } from "@/lib/checklist";
import Link2 from "next/link";
import { STATUS_LABELS, fmtPrice, harmonizedPsf, psf, type Viewing } from "@/lib/types";
import {
  cloudConfigured,
  getDoc,
  isGuest,
  listViewings,
  localViewings,
  migrateLocalToCloud,
} from "@/lib/store";
import type { ChecklistConfig } from "@/lib/checklist";

type SortKey = "newest" | "score" | "price" | "psf";

export default function HomePage() {
  const [viewings, setViewings] = useState<Viewing[] | null>(null);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [guest, setGuestState] = useState(false);
  const [cfg, setCfg] = useState<ChecklistConfig | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [geocoding, setGeocoding] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [beds, setBeds] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  async function load() {
    const g = isGuest();
    setGuestState(g);
    const c = await cloudConfigured();
    setCloud(c);
    const vs = await listViewings(); // redirects to /login if cloud + signed out (non-guest)
    setViewings(vs);
    setCfg(await getDoc<ChecklistConfig>("config").catch(() => null));
    if (c && !g) setLocalCount((await localViewings()).length);
  }

  useEffect(() => {
    load();
  }, []);

  // Geocode viewings missing coordinates when the map opens (cached on the record)
  useEffect(() => {
    if (view !== "map" || !viewings) return;
    const missing = viewings.filter((v) => v.lat === undefined && v.condoName.trim());
    if (!missing.length) return;
    let live = true;
    (async () => {
      setGeocoding(true);
      const { saveViewing } = await import("@/lib/store");
      for (const v of missing) {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(v.condoName)}`);
          const j = await res.json();
          if (j.found) {
            v.lat = j.lat;
            v.lng = j.lng;
            await saveViewing(v);
          }
        } catch {
          /* leave unpinned */
        }
      }
      if (live) {
        setViewings([...viewings]);
        setGeocoding(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewings === null]);

  const districts = useMemo(
    () =>
      Array.from(new Set((viewings ?? []).map((v) => v.district).filter(Boolean))).sort(
        (a, b) => (a as number) - (b as number)
      ),
    [viewings]
  );

  const filtered = useMemo(() => {
    let list = viewings ?? [];
    const text = q.trim().toLowerCase();
    if (text)
      list = list.filter(
        (v) =>
          v.condoName.toLowerCase().includes(text) ||
          (v.area ?? "").toLowerCase().includes(text) ||
          v.block.toLowerCase().includes(text) ||
          v.agent.name.toLowerCase().includes(text)
      );
    if (status) list = list.filter((v) => v.status === status);
    if (district) list = list.filter((v) => String(v.district) === district);
    if (beds) list = list.filter((v) => String(v.bedrooms ?? "") === beds);
    if (maxPrice) list = list.filter((v) => (v.askingPrice ?? 0) <= Number(maxPrice) * 1_000_000);
    const score = (v: Viewing) => overallScore(v.answers, cfg) ?? -1;
    switch (sort) {
      case "score":
        list = [...list].sort((a, b) => score(b) - score(a));
        break;
      case "price":
        list = [...list].sort((a, b) => (a.askingPrice ?? Infinity) - (b.askingPrice ?? Infinity));
        break;
      case "psf":
        list = [...list].sort((a, b) => (psf(a) ?? Infinity) - (psf(b) ?? Infinity));
        break;
      default:
        list = [...list].sort((a, b) => (b.viewingDate || "").localeCompare(a.viewingDate || ""));
    }
    return list;
  }, [viewings, q, status, district, beds, maxPrice, sort, cfg]);

  return (
    <>
      <TopBar
        title="CondoScout SG"
        right={
          cloud ? (
            <Link2 href="/account" aria-label="Account" style={{ fontSize: 19 }}>
              👤
            </Link2>
          ) : undefined
        }
      />
      <div className="shell">
        {guest ? (
          <div className="banner">
            👋 Guest mode — everything is saved on this device only.{" "}
            <a href="/login">Sign in or create an account</a> to sync to the cloud (your device
            data uploads after signing in).
          </div>
        ) : cloud === false ? (
          <div className="banner">
            📱 Storing data on this device only. Add a Blob store to your Vercel project to sync
            to the cloud (see README).
          </div>
        ) : null}
        {cloud && localCount > 0 && (
          <div className="banner">
            ☁️ {localCount} viewing{localCount > 1 ? "s" : ""} found on this device.{" "}
            <button
              className="btn ghost"
              style={{ padding: "6px 12px", fontSize: 13 }}
              disabled={migrating}
              onClick={async () => {
                setMigrating(true);
                await migrateLocalToCloud();
                setMigrating(false);
                await load();
              }}
            >
              {migrating ? "Uploading…" : "Upload to cloud"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="search"
            placeholder="Search condo, area, block or agent…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "0 14px" }}
            onClick={() => setView(view === "list" ? "map" : "list")}
            aria-label="Toggle map view"
          >
            {view === "list" ? "🗺️ Map" : "📋 List"}
          </button>
        </div>
        <div className="filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={String(d)}>
                D{d}
              </option>
            ))}
          </select>
          <select value={beds} onChange={(e) => setBeds(e.target.value)}>
            <option value="">Any beds</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>
                {n === 5 ? "5+" : n} BR
              </option>
            ))}
          </select>
          <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">Any price</option>
            {[1, 1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5].map((m) => (
              <option key={m} value={String(m)}>
                ≤ ${m}M
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">Newest first</option>
            <option value="score">Highest score</option>
            <option value="price">Lowest price</option>
            <option value="psf">Lowest PSF</option>
          </select>
        </div>

        {viewings === null ? (
          <p className="muted" style={{ padding: 24, textAlign: "center" }}>
            Loading…
          </p>
        ) : view === "map" ? (
          <>
            {geocoding && <p className="muted">Locating projects on the map…</p>}
            <MapView
              viewings={filtered}
              scores={Object.fromEntries(filtered.map((v) => [v.id, overallScore(v.answers, cfg)]))}
            />
            <p className="muted" style={{ fontSize: 12 }}>
              Pins show the overall score. Filters above apply to the map too.
            </p>
          </>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="big">🏙️</div>
            {viewings.length === 0 ? (
              <>
                <p>
                  <strong>No viewings yet.</strong>
                </p>
                <p>Tap + to log your first condo viewing.</p>
              </>
            ) : (
              <p>No viewings match these filters.</p>
            )}
          </div>
        ) : (
          filtered.map((v) => {
            const s = overallScore(v.answers, cfg);
            const p = psf(v);
            return (
              <Link href={`/viewing/${v.id}`} key={v.id} className="card vcard">
                <div className="top">
                  <ScoreBadge score={s} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{v.condoName || "Unnamed condo"}</div>
                    <div className="sub">
                      {[
                        v.block && `Blk ${v.block}`,
                        v.unit,
                        v.district && `D${v.district}`,
                        v.viewingDate,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className={`status ${v.status}`}>{STATUS_LABELS[v.status]}</span>
                </div>
                <div className="facts">
                  {v.askingPrice ? <span className="fact">{fmtPrice(v.askingPrice)}</span> : null}
                  {p ? <span className="fact">${p.toLocaleString()} psf</span> : null}
                  {harmonizedPsf(v) && harmonizedPsf(v) !== p ? (
                    <span className="fact">${harmonizedPsf(v)?.toLocaleString()} psf harm.</span>
                  ) : null}
                  {v.sizeSqft ? <span className="fact">{v.sizeSqft} sqft</span> : null}
                  {v.bedrooms ? <span className="fact">{v.bedrooms} BR</span> : null}
                  {v.tenure ? <span className="fact">{v.tenure}</span> : null}
                  {v.photos.length ? <span className="fact">📷 {v.photos.length}</span> : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
