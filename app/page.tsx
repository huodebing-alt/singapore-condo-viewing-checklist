"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import ScoreBadge from "@/components/ScoreBadge";
import { overallScore } from "@/lib/checklist";
import { STATUS_LABELS, fmtPrice, psf, type Viewing } from "@/lib/types";
import { isCloud, listViewings, localViewings, migrateLocalToCloud } from "@/lib/store";

type SortKey = "newest" | "score" | "price" | "psf";

export default function HomePage() {
  const [viewings, setViewings] = useState<Viewing[] | null>(null);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [migrating, setMigrating] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [beds, setBeds] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  async function load() {
    const [vs, c] = await Promise.all([listViewings(), isCloud()]);
    setViewings(vs);
    setCloud(c);
    if (c) setLocalCount((await localViewings()).length);
  }

  useEffect(() => {
    load();
  }, []);

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
    const score = (v: Viewing) => overallScore(v.answers) ?? -1;
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
  }, [viewings, q, status, district, beds, maxPrice, sort]);

  return (
    <>
      <TopBar title="CondoScout SG" />
      <div className="shell">
        {cloud === false && (
          <div className="banner">
            📱 Storing data on this device only. Add a Blob store to your Vercel project to sync
            to the cloud (see README).
          </div>
        )}
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

        <input
          type="search"
          placeholder="Search condo, area, block or agent…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginTop: 12 }}
        />
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
            const s = overallScore(v.answers);
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
