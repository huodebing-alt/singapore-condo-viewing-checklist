"use client";

// Shows 12-month URA transaction history for the linked project (similar
// size) and nearby same-district projects ranked by activity. Auto-loads
// once project + district are known; refines when size changes.

import { useEffect, useRef, useState } from "react";
import { fmtPrice } from "@/lib/types";
import MarketChart, { type MonthPoint } from "./MarketChart";

type Tx = { m: string; sqft: number; fl: string; price: number; sale: string };
type Subject = {
  name: string;
  street: string;
  totalTx: number;
  similarCount: number;
  medianPsf: number | null;
  medianPrice: number | null;
  tx: Tx[];
  monthly?: MonthPoint[];
};
type Nearby = {
  project: string;
  street: string;
  count: number;
  medianPsf: number | null;
  medianPrice: number | null;
  minSqft: number;
  maxSqft: number;
};
type MarketData = { refreshedAt: string; subject: Subject | null; nearby: Nearby[] };

function layoutEst(sqft: number): string {
  if (sqft < 520) return "Studio/1BR";
  if (sqft < 700) return "1–2BR";
  if (sqft < 950) return "2BR";
  if (sqft < 1250) return "3BR";
  if (sqft < 1650) return "3–4BR";
  return "4BR+/PH";
}

function fmtMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(mo) - 1]} ${y.slice(2)}`;
}

export default function MarketCard({
  condoName,
  district,
  sqft,
  askingPrice,
}: {
  condoName: string;
  district?: number;
  sqft?: number;
  askingPrice?: number;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "no-key" | "error">("idle");
  const [data, setData] = useState<MarketData | null>(null);
  const [errDetail, setErrDetail] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    if (!condoName.trim() || !district) return;
    setState("loading");
    try {
      const params = new URLSearchParams({ project: condoName, district: String(district) });
      if (sqft) params.set("sqft", String(sqft));
      const res = await fetch(`/api/market?${params}`, { cache: "no-store" });
      const j = await res.json();
      if (res.status === 501) {
        setState("no-key");
        return;
      }
      if (!res.ok) {
        setErrDetail(j.detail ?? j.error ?? `HTTP ${res.status}`);
        setState("error");
        return;
      }
      setData(j);
      setState("ready");
    } catch {
      setErrDetail("network error");
      setState("error");
    }
  }

  useEffect(() => {
    if (!condoName.trim() || !district) {
      setState("idle");
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoName, district, sqft]);

  if (state === "idle") return null;

  const askingPsf = askingPrice && sqft ? Math.round(askingPrice / sqft) : undefined;
  const medPsf = data?.subject?.medianPsf ?? undefined;
  const askDelta = askingPsf && medPsf ? Math.round(((askingPsf - medPsf) / medPsf) * 100) : undefined;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ flex: 1, marginBottom: 0 }}>📊 Market data (URA, last 12 months)</h2>
        {state === "ready" && (
          <button
            type="button"
            className="chip"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await fetch("/api/market/refresh").catch(() => {});
              setRefreshing(false);
              load();
            }}
          >
            {refreshing ? "…" : "↻"}
          </button>
        )}
      </div>
      <div className="spacer" />

      {state === "loading" && <p className="muted">Loading URA transaction data…</p>}

      {state === "no-key" && (
        <div className="banner">
          <strong>One-time setup needed:</strong> transaction history comes from the official URA
          Data Service, which needs a free access key.
          <ol style={{ margin: "8px 0 4px 18px", fontSize: 13 }}>
            <li>
              Register at{" "}
              <a href="https://eservice.ura.gov.sg/maps/api/" target="_blank" rel="noreferrer">
                eservice.ura.gov.sg/maps/api
              </a>{" "}
              (instant email with your access key)
            </li>
            <li>
              In Vercel → project → Settings → Environment Variables, add{" "}
              <code>URA_ACCESS_KEY</code>
            </li>
            <li>Redeploy — this card then fills itself</li>
          </ol>
        </div>
      )}

      {state === "error" && (
        <div className="banner">
          Couldn&apos;t load market data: {errDetail}.{" "}
          <button type="button" className="chip" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {state === "ready" && data && (
        <>
          {askDelta !== undefined && (
            <div className="metabox">
              <div className="metarow">
                ⚖️ Asking ${askingPsf?.toLocaleString()} psf is{" "}
                <strong style={{ color: askDelta > 0 ? "var(--score-low)" : "var(--score-high)" }}>
                  {askDelta > 0 ? `${askDelta}% above` : askDelta < 0 ? `${-askDelta}% below` : "at"}
                </strong>{" "}
                the 12-month median for similar sizes (${medPsf?.toLocaleString()} psf,{" "}
                {data.subject?.similarCount} transactions).
              </div>
            </div>
          )}

          <h2 style={{ marginTop: 10 }}>
            This project{" "}
            <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
              {sqft ? `· similar size (±20% of ${sqft} sqft)` : "· all sizes"}
            </span>
          </h2>
          {!data.subject ? (
            <p className="muted">
              No transactions found for &ldquo;{condoName}&rdquo; in the last 12 months — URA may
              list it under a slightly different name, or nothing similar has sold recently.
            </p>
          ) : data.subject.tx.length === 0 ? (
            <p className="muted">
              No similar-size transactions in the last 12 months ({data.subject.totalTx} of other
              sizes).
            </p>
          ) : (
            <>
              {data.subject.monthly && <MarketChart monthly={data.subject.monthly} />}
            <div className="tablewrap">
              <table className="compare">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Area</th>
                    <th>Layout est.</th>
                    <th>Floor</th>
                    <th>Price</th>
                    <th>PSF</th>
                    <th>Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subject.tx.map((t, i) => (
                    <tr key={i}>
                      <td>{fmtMonth(t.m)}</td>
                      <td>{t.sqft.toLocaleString()} sqft</td>
                      <td>{layoutEst(t.sqft)}</td>
                      <td>{t.fl}</td>
                      <td>{fmtPrice(t.price)}</td>
                      <td>
                        <strong>${Math.round(t.price / t.sqft).toLocaleString()}</strong>
                      </td>
                      <td>{t.sale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          <h2 style={{ marginTop: 12 }}>
            Nearby projects (D{district}){" "}
            <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
              · similar size, ranked by 12-month activity
            </span>
          </h2>
          {data.nearby.length === 0 ? (
            <p className="muted">No similar-size transactions in other D{district} projects.</p>
          ) : (
            <div className="tablewrap">
              <table className="compare">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Sold (12m)</th>
                    <th>Median PSF</th>
                    <th>Median price</th>
                    <th>Size range</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nearby.map((n) => (
                    <tr key={n.project}>
                      <td>
                        <span className="colname">{n.project}</span>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {n.street}
                        </div>
                      </td>
                      <td>{n.count}</td>
                      <td>
                        <strong>${n.medianPsf?.toLocaleString()}</strong>
                      </td>
                      <td>{fmtPrice(n.medianPrice ?? undefined)}</td>
                      <td>
                        {n.minSqft.toLocaleString()}–{n.maxSqft.toLocaleString()} sqft
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ fontSize: 12 }}>
            Source: URA caveats, refreshed {new Date(data.refreshedAt).toLocaleDateString("en-SG")}
            . &ldquo;Sold (12m)&rdquo; counts completed transactions — live for-sale listing counts
            aren&apos;t published via any public API.
          </p>
        </>
      )}
    </div>
  );
}
