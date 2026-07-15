"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import {
  effectiveSections,
  overallScore,
  scoreColor,
  sectionScore,
  type ChecklistConfig,
} from "@/lib/checklist";
import { STATUS_LABELS, fmtPrice, harmonizedPsf, harmonizedSqft, psf, type Viewing } from "@/lib/types";
import { getDoc, listViewings } from "@/lib/store";

export default function ComparePage() {
  const [viewings, setViewings] = useState<Viewing[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cfg, setCfg] = useState<ChecklistConfig | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getDoc<ChecklistConfig>("config").catch(() => null);
      setCfg(c);
      const vs = await listViewings();
      const sorted = [...vs].sort(
        (a, b) => (overallScore(b.answers, c) ?? -1) - (overallScore(a.answers, c) ?? -1)
      );
      setViewings(sorted);
      // Pre-select non-rejected viewings
      setSelected(new Set(sorted.filter((v) => v.status !== "rejected").map((v) => v.id)));
    })();
  }, []);

  const chosen = useMemo(
    () => (viewings ?? []).filter((v) => selected.has(v.id)),
    [viewings, selected]
  );

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Comparison as rows for CSV/TSV export (Google Sheets friendly). */
  function exportRows(): string[][] {
    const name = (v: Viewing) =>
      `${v.condoName || "Unnamed"}${v.block ? ` Blk ${v.block}` : ""} ${v.unit}`.trim();
    const rows: string[][] = [
      ["Metric", ...chosen.map(name)],
      ["Status", ...chosen.map((v) => STATUS_LABELS[v.status])],
      ["Viewing date", ...chosen.map((v) => v.viewingDate ?? "")],
      ["Overall score", ...chosen.map((v) => String(overallScore(v.answers, cfg) ?? ""))],
      ["Asking price (S$)", ...chosen.map((v) => String(v.askingPrice ?? ""))],
      ["PSF listed (S$)", ...chosen.map((v) => String(psf(v) ?? ""))],
      ["PSF harmonized (S$)", ...chosen.map((v) => String(harmonizedPsf(v) ?? ""))],
      ["Size listed (sqft)", ...chosen.map((v) => String(v.sizeSqft ?? ""))],
      ["Size harmonized (sqft)", ...chosen.map((v) => String(harmonizedSqft(v) ?? ""))],
      ["Beds", ...chosen.map((v) => String(v.bedrooms ?? ""))],
      ["Baths", ...chosen.map((v) => String(v.bathrooms ?? ""))],
      ["District", ...chosen.map((v) => (v.district ? `D${v.district}` : ""))],
      ["Tenure", ...chosen.map((v) => v.tenure ?? "")],
      ["TOP", ...chosen.map((v) => String(v.topYear ?? ""))],
      ["Floor / facing", ...chosen.map((v) => [v.floorBand, v.facing].filter(Boolean).join(" · "))],
      ["MRT", ...chosen.map((v) => v.condoMeta?.mrt ?? "")],
      ["MRT walk (min)", ...chosen.map((v) => String(v.condoMeta?.mrtWalkMins ?? ""))],
      ["Indicative yield (%)", ...chosen.map((v) => String(v.condoMeta?.rentalYieldPct ?? ""))],
      ...effectiveSections(cfg).map((s) => [
        `Score: ${s.title}`,
        ...chosen.map((v) => String(sectionScore(s, v.answers) ?? "")),
      ]),
      ["Agent", ...chosen.map((v) => v.agent.name)],
      ["Agent phone", ...chosen.map((v) => v.agent.phone)],
      ["Agent agency", ...chosen.map((v) => v.agent.agency)],
      ["PropertyGuru link", ...chosen.map((v) => v.pgUrl ?? "")],
      ["Notes", ...chosen.map((v) => v.generalNotes.replace(/\s+/g, " ").trim())],
    ];
    return rows;
  }

  function downloadCsv() {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const csv = exportRows()
      .map((r) => r.map(esc).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `condo-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyForSheets() {
    const tsv = exportRows()
      .map((r) => r.map((c) => c.replace(/\t/g, " ")).join("\t"))
      .join("\n");
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (viewings === null) {
    return (
      <>
        <TopBar title="Compare & analyse" />
        <p className="muted" style={{ padding: 24, textAlign: "center" }}>
          Loading…
        </p>
      </>
    );
  }

  if (viewings.length < 2) {
    return (
      <>
        <TopBar title="Compare & analyse" />
        <div className="empty shell">
          <div className="big">📊</div>
          <p>
            <strong>Log at least two viewings to compare.</strong>
          </p>
          <p>
            <Link href="/viewing/new">Add a viewing →</Link>
          </p>
        </div>
      </>
    );
  }

  // ---------- Insights ----------
  const withScore = chosen.filter((v) => overallScore(v.answers, cfg) !== null);
  const topScore = withScore[0];
  const cheapestPsf = [...chosen]
    .filter((v) => harmonizedPsf(v))
    .sort((a, b) => (harmonizedPsf(a) as number) - (harmonizedPsf(b) as number))[0];
  const bestValue = [...withScore]
    .filter((v) => harmonizedPsf(v))
    .sort(
      (a, b) =>
        (overallScore(b.answers, cfg) as number) / (harmonizedPsf(b) as number) -
        (overallScore(a.answers, cfg) as number) / (harmonizedPsf(a) as number)
    )[0];

  // Best-per-row helpers
  const best = {
    price: Math.min(...chosen.map((v) => v.askingPrice ?? Infinity)),
    psf: Math.min(...chosen.map((v) => psf(v) ?? Infinity)),
    harmPsf: Math.min(...chosen.map((v) => harmonizedPsf(v) ?? Infinity)),
    size: Math.max(...chosen.map((v) => v.sizeSqft ?? -1)),
    yield: Math.max(...chosen.map((v) => v.condoMeta?.rentalYieldPct ?? -1)),
    mrt: Math.min(...chosen.map((v) => v.condoMeta?.mrtWalkMins ?? Infinity)),
    overall: Math.max(...chosen.map((v) => overallScore(v.answers, cfg) ?? -1)),
  };

  return (
    <>
      <TopBar title="Compare & analyse" />
      <div className="shell">
        <div className="card">
          <h2>Choose viewings ({chosen.length} selected)</h2>
          {viewings.map((v) => (
            <label className="checkrow" key={v.id}>
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggle(v.id)}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {v.condoName || "Unnamed"}{" "}
                  <span className="muted">
                    {v.block && `Blk ${v.block}`} {v.unit}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {STATUS_LABELS[v.status]} · {v.viewingDate}
                </div>
              </div>
              <span
                className="score-pill"
                style={{ background: scoreColor(overallScore(v.answers, cfg)) }}
              >
                {overallScore(v.answers, cfg) ?? "—"}
              </span>
            </label>
          ))}
        </div>

        {chosen.length >= 2 && (
          <>
            {/* Insights */}
            <div className="card">
              <h2>💡 Insights</h2>
              {topScore && (
                <p style={{ fontSize: 14, margin: "6px 0" }}>
                  🏆 <strong>{topScore.condoName}</strong> scores highest overall (
                  {overallScore(topScore.answers, cfg)}/100).
                </p>
              )}
              {cheapestPsf && (
                <p style={{ fontSize: 14, margin: "6px 0" }}>
                  💰 <strong>{cheapestPsf.condoName}</strong> is cheapest per sqft ($
                  {harmonizedPsf(cheapestPsf)?.toLocaleString()} psf, harmonized basis).
                </p>
              )}
              {bestValue && (
                <p style={{ fontSize: 14, margin: "6px 0" }}>
                  ⚖️ <strong>{bestValue.condoName}</strong> gives the best score-for-price
                  balance.
                </p>
              )}
            </div>

            {/* Overall ranking bars */}
            <div className="card">
              <h2>Overall ranking</h2>
              {withScore.map((v) => {
                const s = overallScore(v.answers, cfg) as number;
                return (
                  <div className="rankrow" key={v.id}>
                    <div className="rname">{v.condoName || "Unnamed"}</div>
                    <div className="bar">
                      <div style={{ width: `${s}%`, background: scoreColor(s) }} />
                    </div>
                    <div className="rscore">{s}</div>
                  </div>
                );
              })}
            </div>

            {/* Export */}
            <div className="card">
              <h2>Export to Google Sheets</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn ghost" onClick={copyForSheets}>
                  {copied ? "Copied ✓ — paste into a Sheet" : "📋 Copy for Sheets"}
                </button>
                <button type="button" className="btn ghost" onClick={downloadCsv}>
                  ⬇️ Download CSV
                </button>
                <a
                  className="btn ghost"
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  ↗ Open sheets.new
                </a>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                &ldquo;Copy for Sheets&rdquo; puts the whole comparison on your clipboard — open a
                Google Sheet and paste (Cmd/Ctrl-V). The CSV imports via File → Import.
              </p>
            </div>

            {/* Side-by-side table */}
            <div className="card">
              <h2>Side by side</h2>
              <div className="tablewrap">
                <table className="compare">
                  <tbody>
                    <tr>
                      <th>Unit</th>
                      {chosen.map((v) => (
                        <td key={v.id}>
                          <Link href={`/viewing/${v.id}`} className="colname">
                            {v.condoName || "Unnamed"}
                          </Link>
                          <div className="muted" style={{ fontSize: 11 }}>
                            {v.block && `Blk ${v.block}`} {v.unit}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th>Overall score</th>
                      {chosen.map((v) => {
                        const s = overallScore(v.answers, cfg);
                        return (
                          <td key={v.id} className={s !== null && s === best.overall ? "best" : ""}>
                            {s ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th>Asking price</th>
                      {chosen.map((v) => (
                        <td
                          key={v.id}
                          className={v.askingPrice && v.askingPrice === best.price ? "best" : ""}
                        >
                          {fmtPrice(v.askingPrice)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th>PSF (listed)</th>
                      {chosen.map((v) => {
                        const p = psf(v);
                        return (
                          <td key={v.id} className={p && p === best.psf ? "best" : ""}>
                            {p ? `$${p.toLocaleString()}` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th>PSF (harmonized)</th>
                      {chosen.map((v) => {
                        const hp = harmonizedPsf(v);
                        return (
                          <td key={v.id} className={hp && hp === best.harmPsf ? "best" : ""}>
                            {hp ? `$${hp.toLocaleString()}` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th>Size (listed / harmonized)</th>
                      {chosen.map((v) => (
                        <td
                          key={v.id}
                          className={v.sizeSqft && v.sizeSqft === best.size ? "best" : ""}
                        >
                          {v.sizeSqft
                            ? `${v.sizeSqft} / ${harmonizedSqft(v)?.toLocaleString()} sqft`
                            : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th>🚇 MRT walk</th>
                      {chosen.map((v) => {
                        const m = v.condoMeta?.mrtWalkMins;
                        return (
                          <td key={v.id} className={m && m === best.mrt ? "best" : ""}>
                            {v.condoMeta?.mrt ? `${v.condoMeta.mrt}${m ? ` · ${m} min` : ""}` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th>📈 Indicative yield</th>
                      {chosen.map((v) => {
                        const y = v.condoMeta?.rentalYieldPct;
                        return (
                          <td key={v.id} className={y && y === best.yield ? "best" : ""}>
                            {y ? `~${y}%` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th>🏫 Schools 1km</th>
                      {chosen.map((v) => (
                        <td key={v.id} style={{ whiteSpace: "normal", maxWidth: 180 }}>
                          {v.condoMeta?.schools1km?.length
                            ? v.condoMeta.schools1km.join(", ")
                            : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th>Beds / baths</th>
                      {chosen.map((v) => (
                        <td key={v.id}>
                          {v.bedrooms ?? "—"} / {v.bathrooms ?? "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th>District</th>
                      {chosen.map((v) => (
                        <td key={v.id}>{v.district ? `D${v.district}` : "—"}</td>
                      ))}
                    </tr>
                    <tr>
                      <th>Tenure</th>
                      {chosen.map((v) => (
                        <td key={v.id}>{v.tenure ?? "—"}</td>
                      ))}
                    </tr>
                    <tr>
                      <th>TOP</th>
                      {chosen.map((v) => (
                        <td key={v.id}>{v.topYear ?? "—"}</td>
                      ))}
                    </tr>
                    <tr>
                      <th>Floor / facing</th>
                      {chosen.map((v) => (
                        <td key={v.id}>
                          {[v.floorBand, v.facing].filter(Boolean).join(" · ") || "—"}
                        </td>
                      ))}
                    </tr>
                    {effectiveSections(cfg).map((s) => {
                      const rowScores = chosen.map((v) => sectionScore(s, v.answers));
                      const rowBest = Math.max(...rowScores.map((x) => x ?? -1));
                      return (
                        <tr key={s.id}>
                          <th>
                            {s.emoji} {s.title}
                          </th>
                          {chosen.map((v, i) => {
                            const sc = rowScores[i];
                            return (
                              <td
                                key={v.id}
                                className={sc !== null && sc === rowBest ? "best" : ""}
                              >
                                {sc !== null ? (
                                  <span
                                    className="score-pill"
                                    style={{ background: scoreColor(sc) }}
                                  >
                                    {sc}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr>
                      <th>Agent</th>
                      {chosen.map((v) => (
                        <td key={v.id}>
                          {v.agent.name || "—"}
                          {v.agent.phone && (
                            <div>
                              <a href={`tel:${v.agent.phone}`} style={{ fontSize: 12 }}>
                                {v.agent.phone}
                              </a>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="muted">Green cells mark the best unit in each row. Scroll sideways →</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
