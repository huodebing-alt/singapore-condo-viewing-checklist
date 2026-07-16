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

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function ComparePage() {
  const [viewings, setViewings] = useState<Viewing[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cfg, setCfg] = useState<ChecklistConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [sheetState, setSheetState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetErr, setSheetErr] = useState("");

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

  // ---------- Export: one styled row model drives CSV, clipboard and Sheets ----------

  type CellKind = "header" | "label" | "section" | "score" | "ans" | "money" | "num" | "pct" | "text";
  type Cell = { v: string | number; k: CellKind; s?: number | null };

  function buildRows(): Cell[][] {
    const name = (v: Viewing) =>
      `${v.condoName || "Unnamed"}${v.block ? ` Blk ${v.block}` : ""} ${v.unit}`.trim();
    const label = (t: string): Cell => ({ v: t, k: "label" });
    const txt = (t: string | number | undefined | null): Cell => ({ v: t ?? "", k: "text" });
    const money = (n?: number): Cell => ({ v: n ?? "", k: "money" });
    const num = (n?: number): Cell => ({ v: n ?? "", k: "num" });

    const rows: Cell[][] = [];
    rows.push([{ v: "Metric", k: "header" }, ...chosen.map((v) => ({ v: name(v), k: "header" as const }))]);
    rows.push([label("Status"), ...chosen.map((v) => txt(STATUS_LABELS[v.status]))]);
    rows.push([label("Viewing date"), ...chosen.map((v) => txt(v.viewingDate))]);
    rows.push([
      label("Overall score"),
      ...chosen.map((v) => {
        const sc = overallScore(v.answers, cfg);
        return { v: sc ?? "—", k: "score" as const, s: sc };
      }),
    ]);
    rows.push([label("Asking price"), ...chosen.map((v) => money(v.askingPrice))]);
    rows.push([label("PSF (listed)"), ...chosen.map((v) => money(psf(v)))]);
    rows.push([label("PSF (harmonized)"), ...chosen.map((v) => money(harmonizedPsf(v)))]);
    rows.push([label("Size listed (sqft)"), ...chosen.map((v) => num(v.sizeSqft))]);
    rows.push([label("Size harmonized (sqft)"), ...chosen.map((v) => num(harmonizedSqft(v)))]);
    rows.push([label("Beds"), ...chosen.map((v) => num(v.bedrooms))]);
    rows.push([label("Baths"), ...chosen.map((v) => num(v.bathrooms))]);
    rows.push([label("District"), ...chosen.map((v) => txt(v.district ? `D${v.district}` : ""))]);
    rows.push([label("Tenure"), ...chosen.map((v) => txt(v.tenure))]);
    rows.push([label("TOP"), ...chosen.map((v) => txt(v.topYear))]);
    rows.push([
      label("Floor / facing"),
      ...chosen.map((v) => txt([v.floorBand, v.facing].filter(Boolean).join(" · "))),
    ]);
    rows.push([label("MRT"), ...chosen.map((v) => txt(v.condoMeta?.mrt))]);
    rows.push([label("MRT walk (min)"), ...chosen.map((v) => num(v.condoMeta?.mrtWalkMins))]);
    rows.push([
      label("Indicative yield"),
      ...chosen.map((v) =>
        v.condoMeta?.rentalYieldPct ? { v: v.condoMeta.rentalYieldPct, k: "pct" as const } : txt("")
      ),
    ]);

    for (const sec of effectiveSections(cfg)) {
      rows.push([
        { v: `${sec.emoji} ${sec.title}`, k: "section" },
        ...chosen.map((v) => {
          const sc = sectionScore(sec, v.answers);
          return { v: sc ?? "—", k: "score" as const, s: sc };
        }),
      ]);
      for (const q of sec.questions) {
        rows.push([
          label(`   ${q.label}${q.weight !== 1 ? ` (×${q.weight})` : ""}`),
          ...chosen.map((v) => {
            const val = v.answers[q.id];
            if (!val) return { v: "—", k: "ans" as const, s: null };
            const opt = q.options.find((o) => o.value === val);
            return { v: opt?.label ?? val, k: "ans" as const, s: opt?.score ?? null };
          }),
        ]);
      }
      if (chosen.some((v) => v.sectionNotes[sec.id])) {
        rows.push([
          label("   ↳ Notes"),
          ...chosen.map((v) => txt((v.sectionNotes[sec.id] ?? "").replace(/\s+/g, " "))),
        ]);
      }
    }

    rows.push([label("Agent"), ...chosen.map((v) => txt(v.agent.name))]);
    rows.push([label("Agent phone"), ...chosen.map((v) => txt(v.agent.phone))]);
    rows.push([label("Agent agency"), ...chosen.map((v) => txt(v.agent.agency))]);
    rows.push([label("PropertyGuru link"), ...chosen.map((v) => txt(v.pgUrl))]);
    rows.push([
      label("General notes"),
      ...chosen.map((v) => txt(v.generalNotes.replace(/\s+/g, " ").trim())),
    ]);
    return rows;
  }

  const plainRows = () => buildRows().map((r) => r.map((c) => String(c.v)));

  function downloadCsv() {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const csv = plainRows()
      .map((r) => r.map(esc).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `condo-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyForSheets() {
    const tsv = plainRows()
      .map((r) => r.map((c) => c.replace(/\t/g, " ")).join("\t"))
      .join("\n");
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ---------- Google Sheet with app-like formatting ----------

  const rgb = (hex: string) => ({
    red: parseInt(hex.slice(1, 3), 16) / 255,
    green: parseInt(hex.slice(3, 5), 16) / 255,
    blue: parseInt(hex.slice(5, 7), 16) / 255,
  });
  const INK = rgb("#17271d");
  const WHITE = rgb("#ffffff");
  const scoreBg = (s: number) => rgb(s >= 75 ? "#2f8f60" : s >= 50 ? "#d99a06" : "#d64545");
  const ANS_BG: Record<number, string> = { 3: "#c9ecd8", 2: "#e3f4ea", 1: "#fdeec7", 0: "#f8d3d3" };

  function sheetCell(c: Cell, colIdx: number) {
    const value =
      typeof c.v === "number" ? { numberValue: c.v } : { stringValue: String(c.v) };
    const fmt: Record<string, unknown> = {
      textFormat: { foregroundColor: INK, fontSize: 10 },
      verticalAlignment: "MIDDLE",
      wrapStrategy: colIdx === 0 ? "WRAP" : "CLIP",
    };
    switch (c.k) {
      case "header":
        fmt.backgroundColor = rgb("#12382a");
        fmt.textFormat = { foregroundColor: WHITE, bold: true, fontSize: 10 };
        fmt.wrapStrategy = "WRAP";
        break;
      case "section":
        fmt.backgroundColor = rgb("#d9efe2");
        fmt.textFormat = { foregroundColor: INK, bold: true, fontSize: 10 };
        break;
      case "score":
        if (typeof c.s === "number") {
          fmt.backgroundColor = scoreBg(c.s);
          fmt.textFormat = { foregroundColor: WHITE, bold: true, fontSize: 10 };
        } else fmt.backgroundColor = rgb("#eef1ef");
        fmt.horizontalAlignment = "CENTER";
        break;
      case "ans":
        fmt.backgroundColor = rgb(
          typeof c.s === "number" ? ANS_BG[c.s] ?? "#f1f4f2" : "#f1f4f2"
        );
        break;
      case "money":
        fmt.numberFormat = { type: "CURRENCY", pattern: "$#,##0" };
        break;
      case "num":
        fmt.numberFormat = { type: "NUMBER", pattern: "#,##0" };
        break;
      case "pct":
        fmt.numberFormat = { type: "NUMBER", pattern: '0.0"%"' };
        break;
      case "label":
        fmt.textFormat = { foregroundColor: INK, bold: true, fontSize: 10 };
        break;
    }
    return { userEnteredValue: value, userEnteredFormat: fmt };
  }

  /** One-click: OAuth popup → create a formatted spreadsheet → link to it. */
  async function createGoogleSheet() {
    if (!GOOGLE_CLIENT_ID) return;
    setSheetState("working");
    setSheetErr("");
    setSheetUrl("");
    try {
      if (!window.google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://accounts.google.com/gsi/client";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Couldn't load Google script"));
          document.body.appendChild(s);
        });
      }
      const token = await new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          // drive.file is non-sensitive (per-file access to files this app
          // creates) and is sufficient for spreadsheets.create.
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (resp) => {
            if (resp.access_token) resolve(resp.access_token);
            else reject(new Error(resp.error ?? "Authorization declined"));
          },
        });
        client.requestAccessToken();
      });
      const rows = buildRows();
      const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title: `Condo comparison ${new Date().toLocaleDateString("en-SG")}` },
          sheets: [
            {
              properties: {
                title: "Comparison",
                gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 },
              },
              data: [
                {
                  rowData: rows.map((r) => ({ values: r.map((c, ci) => sheetCell(c, ci)) })),
                  columnMetadata: [
                    { pixelSize: 300 },
                    ...chosen.map(() => ({ pixelSize: 170 })),
                  ],
                },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? `Sheets API error ${res.status}`);
      }
      const sheet = await res.json();
      setSheetUrl(sheet.spreadsheetUrl);
      setSheetState("done");
      window.open(sheet.spreadsheetUrl, "_blank"); // often blocked post-await; link below is the reliable path
    } catch (e) {
      setSheetErr(e instanceof Error ? e.message : String(e));
      setSheetState("error");
    }
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
                {GOOGLE_CLIENT_ID && (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={sheetState === "working"}
                    onClick={createGoogleSheet}
                  >
                    {sheetState === "working" ? "Creating sheet…" : "✨ Create Google Sheet"}
                  </button>
                )}
                <button type="button" className="btn ghost" onClick={copyForSheets}>
                  {copied ? "Copied ✓ — paste into a Sheet" : "📋 Copy for Sheets"}
                </button>
                <button type="button" className="btn ghost" onClick={downloadCsv}>
                  ⬇️ Download CSV
                </button>
              </div>
              {sheetState === "done" && sheetUrl && (
                <div className="banner" style={{ marginTop: 10 }}>
                  ✅ Sheet created!{" "}
                  <a href={sheetUrl} target="_blank" rel="noreferrer">
                    <strong>Open the Google Sheet →</strong>
                  </a>{" "}
                  (it&apos;s also in your Google Drive as &ldquo;Condo comparison&rdquo;)
                </div>
              )}
              {sheetState === "error" && (
                <p style={{ color: "var(--score-low)", fontSize: 13, marginTop: 8 }}>
                  Couldn&apos;t create the sheet: {sheetErr}
                </p>
              )}
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                {GOOGLE_CLIENT_ID
                  ? "“Create Google Sheet” asks for one-time Google authorization, builds the sheet and opens it."
                  : "One-click sheet creation needs a Google OAuth client ID (same setup as Google sign-in — see README). Until then: copy & paste into a sheet, or import the CSV."}
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
