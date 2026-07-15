"use client";

// OTP → Exercise → Completion process tracker. Tasks auto-schedule from the
// OTP date + configured exercise/completion durations, sort by date, show
// owner, predecessors/successors, and completion state. Your own tasks are
// highlighted.

import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import {
  OWNER_COLORS,
  OWNER_LABELS,
  TASK_NEXT,
  emptyPlan,
  scheduledTasks,
  type PurchasePlan,
} from "@/lib/purchase";
import { getDoc, saveDoc } from "@/lib/store";
import { listViewings } from "@/lib/store";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function PurchasePage() {
  const [plan, setPlan] = useState<PurchasePlan | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [openTask, setOpenTask] = useState<number | null>(null);
  const [saveState, setSaveState] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    getDoc<PurchasePlan>("purchase")
      .then((p) => setPlan(p ?? emptyPlan()))
      .catch(() => setPlan(emptyPlan()));
    listViewings()
      .then((vs) =>
        setNames([...new Set(vs.map((v) => v.condoName).filter(Boolean))])
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!plan || !dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("Saving…");
    timer.current = setTimeout(async () => {
      await saveDoc("purchase", plan);
      setSaveState("Saved ✓");
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [plan]);

  function update(patch: Partial<PurchasePlan>) {
    dirty.current = true;
    setPlan((p) => (p ? { ...p, ...patch } : p));
  }

  const tasks = useMemo(() => (plan ? scheduledTasks(plan) : []), [plan]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!plan) {
    return (
      <>
        <TopBar title="Purchase process" />
        <p className="muted" style={{ padding: 24, textAlign: "center" }}>
          Loading…
        </p>
      </>
    );
  }

  const doneCount = tasks.filter((t) => plan.done[t.no]).length;
  const exerciseDate = new Date(plan.otpDate + "T00:00:00");
  exerciseDate.setDate(exerciseDate.getDate() + plan.exerciseWeeks * 7);
  const completionDate = new Date(exerciseDate);
  completionDate.setDate(completionDate.getDate() + plan.completionWeeks * 7);

  return (
    <>
      <TopBar title="Purchase process" right={<span style={{ fontSize: 12 }}>{saveState}</span>} />
      <div className="shell">
        {/* Config */}
        <div className="card">
          <h2>⚙️ Deal setup</h2>
          <label className="field">
            <span className="lbl">Property</span>
            <input
              type="text"
              list="viewed-names"
              placeholder="e.g. Bayshore Park #10-07"
              value={plan.propertyName}
              onChange={(e) => update({ propertyName: e.target.value })}
            />
            <datalist id="viewed-names">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <div className="row3">
            <label className="field">
              <span className="lbl">OTP date</span>
              <input
                type="date"
                value={plan.otpDate}
                onChange={(e) => update({ otpDate: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="lbl">Exercise (weeks)</span>
              <select
                value={plan.exerciseWeeks}
                onChange={(e) => update({ exerciseWeeks: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((w) => (
                  <option key={w} value={w}>
                    {w} wk{w > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="lbl">Completion (weeks)</span>
              <select
                value={plan.completionWeeks}
                onChange={(e) => update({ completionWeeks: Number(e.target.value) })}
              >
                {[6, 8, 10, 12, 14, 16].map((w) => (
                  <option key={w} value={w}>
                    {w} wks
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="metabox">
            <div className="metarow">📅 Exercise deadline: <strong>{fmtDate(exerciseDate)}</strong> (standard: 2 weeks after OTP)</div>
            <div className="metarow">🔑 Completion: <strong>{fmtDate(completionDate)}</strong> (standard: 10–12 weeks after exercise)</div>
            <div className="metarow">✅ Progress: <strong>{doneCount}/{tasks.length}</strong> tasks done</div>
          </div>
          <div className="bar" style={{ height: 8 }}>
            <div style={{ width: `${(doneCount / tasks.length) * 100}%`, background: "var(--brand-500)" }} />
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="chips">
            {(Object.keys(OWNER_LABELS) as (keyof typeof OWNER_LABELS)[]).map((o) => (
              <span key={o} className="score-pill" style={{ background: OWNER_COLORS[o] }}>
                {OWNER_LABELS[o]}
              </span>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Tasks you do yourself are highlighted green. Tap a task for details and its
            predecessor (⬅) / successor (➡) task numbers. Overdue undone tasks show in red.
          </p>
        </div>

        {/* Task list */}
        {tasks.map((t) => {
          const done = !!plan.done[t.no];
          const overdue = !done && t.date < today;
          const mine = t.owners[0] === "me" || t.owners.includes("me");
          const open = openTask === t.no;
          const prereqsUndone = t.prereqs.filter((p) => !plan.done[p]);
          return (
            <div
              key={t.no}
              className="card"
              style={{
                margin: "8px 0",
                borderLeft: mine ? "4px solid var(--brand-600)" : "4px solid transparent",
                background: mine ? "#f4faf6" : undefined,
                opacity: done ? 0.62 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={done}
                  style={{ width: 22, height: 22, accentColor: "var(--brand-600)", marginTop: 2 }}
                  onChange={(e) =>
                    update({ done: { ...plan.done, [t.no]: e.target.checked } })
                  }
                />
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setOpenTask(open ? null : t.no)}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: overdue ? "var(--score-low)" : "var(--muted)" }}>
                    T{t.no} · {fmtDate(t.date)} {overdue && "· OVERDUE"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, textDecoration: done ? "line-through" : "none" }}>
                    {t.title}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                    {t.owners.map((o) => (
                      <span key={o} className="score-pill" style={{ background: OWNER_COLORS[o], fontSize: 11 }}>
                        {OWNER_LABELS[o]}
                      </span>
                    ))}
                    {t.prereqs.length > 0 && (
                      <span className="fact">⬅ after {t.prereqs.map((p) => `T${p}`).join(", ")}</span>
                    )}
                    {TASK_NEXT[t.no]?.length ? (
                      <span className="fact">➡ then {TASK_NEXT[t.no].map((n) => `T${n}`).join(", ")}</span>
                    ) : null}
                  </div>
                  {open && (
                    <>
                      <p style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.55 }}>{t.detail}</p>
                      {prereqsUndone.length > 0 && !done && (
                        <p style={{ fontSize: 12.5, color: "var(--score-mid)", marginTop: 6 }}>
                          ⚠️ Waiting on: {prereqsUndone.map((p) => `T${p}`).join(", ")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <p className="muted" style={{ fontSize: 12, margin: "14px 0" }}>
          Standard flow for a private resale purchase (1% option → exercise within {plan.exerciseWeeks} wk
          + 4% → BSD within 14 days → completion). Adjust the durations above to match your OTP;
          always follow your lawyer&apos;s dates where they differ.
        </p>
      </div>
    </>
  );
}
