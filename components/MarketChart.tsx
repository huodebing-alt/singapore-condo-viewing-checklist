"use client";

// 12-month market chart: two stacked panels on one shared month axis —
// average transacted price (line, top) and transaction count (bars, bottom).
// Two panels, one y-scale each (never a dual-axis plot). Tap/hover a month
// for the exact numbers.

import { useState } from "react";

export type MonthPoint = { m: string; count: number; avgPrice: number | null; avgPsf: number | null };

const W = 640;
const PRICE_H = 120;
const COUNT_H = 78;
const GAP = 26;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 8;
const X_H = 22;
const H = PAD_T + PRICE_H + GAP + COUNT_H + X_H;

const INK = "#17271d";
const MUTED = "#66796c";
const GRID = "#e3ede6";
const BAR = "#2f8f60"; // count series
const LINE = "#2c5c96"; // price series

function fmtM(m: string): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(m.slice(5)) - 1];
}

function fmtPrice(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

export default function MarketChart({ monthly }: { monthly: MonthPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!monthly.length || monthly.every((p) => p.count === 0)) return null;

  const n = monthly.length;
  const slot = (W - PAD_L - PAD_R) / n;
  const xc = (i: number) => PAD_L + slot * i + slot / 2;

  // price scale (top panel)
  const prices = monthly.map((p) => p.avgPrice).filter((v): v is number => v !== null);
  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);
  const pPad = Math.max((pMax - pMin) * 0.15, pMax * 0.02);
  const pLo = Math.max(0, pMin - pPad);
  const pHi = pMax + pPad;
  const py = (v: number) => PAD_T + PRICE_H - ((v - pLo) / (pHi - pLo)) * PRICE_H;

  // count scale (bottom panel)
  const cMax = Math.max(...monthly.map((p) => p.count), 1);
  const cTop = PAD_T + PRICE_H + GAP;
  const cy = (v: number) => cTop + COUNT_H - (v / cMax) * COUNT_H;

  // line path through months that have data
  const pts = monthly
    .map((p, i) => (p.avgPrice !== null ? { x: xc(i), y: py(p.avgPrice), i } : null))
    .filter((p): p is { x: number; y: number; i: number } => !!p);
  const linePath = pts.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const barW = Math.min(slot * 0.55, 26);
  const a = active !== null ? monthly[active] : null;

  return (
    <div>
      {/* tooltip / readout row (fixed height so the chart doesn't jump) */}
      <div style={{ minHeight: 22, fontSize: 12.5, color: INK, fontWeight: 600 }}>
        {a ? (
          <>
            {fmtM(a.m)} {a.m.slice(0, 4)} — {a.count} transaction{a.count === 1 ? "" : "s"}
            {a.avgPrice !== null && <> · avg {fmtPrice(a.avgPrice)} (${a.avgPsf?.toLocaleString()} psf)</>}
          </>
        ) : (
          <span style={{ color: MUTED, fontWeight: 400 }}>Tap a month for exact numbers</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Monthly average transacted price and transaction count, last 12 months"
      >
        {/* panel titles (text carries identity; marks echo it) */}
        <text x={PAD_L} y={PAD_T + 2} fontSize="11" fill={MUTED}>
          Avg transacted price
        </text>
        <text x={PAD_L} y={cTop - 6} fontSize="11" fill={MUTED}>
          Transactions / month
        </text>

        {/* price grid: 3 lines */}
        {[0, 0.5, 1].map((f) => {
          const v = pLo + (pHi - pLo) * f;
          return (
            <g key={f}>
              <line x1={PAD_L} x2={W - PAD_R} y1={py(v)} y2={py(v)} stroke={GRID} strokeWidth="1" />
              <text x={PAD_L - 5} y={py(v) + 3.5} fontSize="10" fill={MUTED} textAnchor="end">
                {fmtPrice(v)}
              </text>
            </g>
          );
        })}
        {/* count baseline + max tick */}
        <line x1={PAD_L} x2={W - PAD_R} y1={cy(0)} y2={cy(0)} stroke={GRID} strokeWidth="1" />
        <text x={PAD_L - 5} y={cy(cMax) + 3.5} fontSize="10" fill={MUTED} textAnchor="end">
          {cMax}
        </text>
        <text x={PAD_L - 5} y={cy(0) + 3.5} fontSize="10" fill={MUTED} textAnchor="end">
          0
        </text>

        {/* count bars: thin, rounded data end, baseline-anchored */}
        {monthly.map((p, i) =>
          p.count > 0 ? (
            <rect
              key={p.m}
              x={xc(i) - barW / 2}
              y={cy(p.count)}
              width={barW}
              height={Math.max(cy(0) - cy(p.count), 2)}
              rx="3"
              fill={BAR}
              opacity={active === null || active === i ? 1 : 0.45}
            />
          ) : null
        )}

        {/* price line + dots */}
        {pts.length > 1 && (
          <path d={linePath} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        )}
        {pts.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={active === p.i ? 5 : 3.5}
            fill={LINE}
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}

        {/* crosshair for active month */}
        {active !== null && (
          <line
            x1={xc(active)}
            x2={xc(active)}
            y1={PAD_T + 6}
            y2={cy(0)}
            stroke={MUTED}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.6"
          />
        )}

        {/* x labels: every 2nd month */}
        {monthly.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p.m} x={xc(i)} y={H - 6} fontSize="10" fill={MUTED} textAnchor="middle">
              {fmtM(p.m)}
            </text>
          ) : null
        )}

        {/* hover/tap targets: full-height columns, larger than the marks */}
        {monthly.map((p, i) => (
          <rect
            key={`hit-${p.m}`}
            x={PAD_L + slot * i}
            y={0}
            width={slot}
            height={H}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
    </div>
  );
}
