"use client";

// Checklist customization: reword/hide questions, edit options & scores,
// add custom questions, and weight every question's importance. Overall
// scores are the weighted average; unanswered questions count at the
// midpoint of their scale.

import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import {
  SECTIONS,
  WEIGHT_OPTIONS,
  type ChecklistConfig,
  type CustomQuestion,
  type Option,
  type Question,
  type QuestionOverride,
} from "@/lib/checklist";
import { getDoc, saveDoc } from "@/lib/store";

const SCALE_TEMPLATES: Record<string, Option[]> = {
  quality: [
    { value: "poor", label: "Poor", score: 0 },
    { value: "fair", label: "Fair", score: 1 },
    { value: "good", label: "Good", score: 2 },
    { value: "excellent", label: "Excellent", score: 3 },
  ],
  yesno: [
    { value: "yes", label: "Yes", score: 3 },
    { value: "partly", label: "Partly", score: 2 },
    { value: "no", label: "No", score: 0 },
  ],
  severity: [
    { value: "none", label: "None", score: 3 },
    { value: "minor", label: "Minor", score: 2 },
    { value: "moderate", label: "Moderate", score: 1 },
    { value: "serious", label: "Serious", score: 0 },
  ],
};

function OptionsEditor({
  options,
  onChange,
}: {
  options: Option[];
  onChange: (opts: Option[]) => void;
}) {
  return (
    <div style={{ marginTop: 6 }}>
      <span className="lbl">Options &amp; scores (0 worst → 3 best; blank = not scored)</span>
      {options.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            type="text"
            value={o.label}
            style={{ flex: 1 }}
            onChange={(e) => {
              const next = options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
              onChange(next);
            }}
          />
          <select
            value={o.score ?? ""}
            style={{ width: 74 }}
            onChange={(e) => {
              const next = options.map((x, j) =>
                j === i
                  ? { ...x, score: e.target.value === "" ? undefined : Number(e.target.value) }
                  : x
              );
              onChange(next);
            }}
          >
            <option value="">—</option>
            {[0, 1, 2, 3].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="chip"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            aria-label="Remove option"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="chip"
        onClick={() =>
          onChange([...options, { value: `opt_${options.length}_${Math.random().toString(36).slice(2, 6)}`, label: "New option", score: 2 }])
        }
      >
        + Add option
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<ChecklistConfig>({ overrides: {}, custom: [] });
  const [loaded, setLoaded] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saveState, setSaveState] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    getDoc<ChecklistConfig>("config")
      .then((c) => c && setCfg({ overrides: c.overrides ?? {}, custom: c.custom ?? [] }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("Saving…");
    timer.current = setTimeout(async () => {
      await saveDoc("config", cfg);
      setSaveState("Saved ✓");
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cfg, loaded]);

  function setOverride(qid: string, patch: Partial<QuestionOverride>) {
    dirty.current = true;
    setCfg((c) => {
      const cur = c.overrides?.[qid] ?? {};
      const next = { ...cur, ...patch };
      // drop empty overrides
      const clean = Object.fromEntries(
        Object.entries(next).filter(([, v]) => v !== undefined)
      ) as QuestionOverride;
      const overrides = { ...(c.overrides ?? {}) };
      if (Object.keys(clean).length === 0) delete overrides[qid];
      else overrides[qid] = clean;
      return { ...c, overrides };
    });
  }

  function setCustom(id: string, patch: Partial<CustomQuestion> | null) {
    dirty.current = true;
    setCfg((c) => ({
      ...c,
      custom:
        patch === null
          ? (c.custom ?? []).filter((q) => q.id !== id)
          : (c.custom ?? []).map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  }

  function addCustom(sectionId: string) {
    dirty.current = true;
    const id = `cq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setCfg((c) => ({
      ...c,
      custom: [
        ...(c.custom ?? []),
        { id, sectionId, label: "New question", options: [...SCALE_TEMPLATES.quality], weight: 1 },
      ],
    }));
    setEditing(id);
  }

  function renderRow(q: Question, custom?: CustomQuestion) {
    const ov = custom ? undefined : cfg.overrides?.[q.id];
    const hidden = ov?.hidden ?? false;
    const weight = custom ? (custom.weight ?? 1) : (ov?.weight ?? 1);
    const label = custom ? custom.label : (ov?.label ?? q.label);
    const options = custom ? custom.options : (ov?.options ?? q.options);
    const isEditing = editing === q.id;
    const modified = custom || (ov && Object.keys(ov).length > 0);

    return (
      <div className="q" key={q.id} style={hidden ? { opacity: 0.45 } : undefined}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="qlabel" style={{ flex: 1, marginBottom: 0, textDecoration: hidden ? "line-through" : "none" }}>
            {label}
            {custom && <span className="score-pill" style={{ background: "var(--brand-500)", marginLeft: 6 }}>custom</span>}
            {!custom && modified && <span className="muted" style={{ fontWeight: 400 }}> (edited)</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <select
            value={weight}
            style={{ width: "auto", height: 38, padding: "6px 8px", fontSize: 13 }}
            disabled={hidden}
            onChange={(e) => {
              const w = Number(e.target.value);
              if (custom) setCustom(q.id, { weight: w });
              else setOverride(q.id, { weight: w === 1 ? undefined : w });
            }}
          >
            {WEIGHT_OPTIONS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          <button type="button" className="chip" onClick={() => setEditing(isEditing ? null : q.id)}>
            {isEditing ? "Done" : "Edit"}
          </button>
          {custom ? (
            <button
              type="button"
              className="chip"
              onClick={() => confirm("Delete this custom question?") && setCustom(q.id, null)}
            >
              Delete
            </button>
          ) : (
            <>
              <button
                type="button"
                className="chip"
                onClick={() => setOverride(q.id, { hidden: hidden ? undefined : true })}
              >
                {hidden ? "Show" : "Hide"}
              </button>
              {modified && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    dirty.current = true;
                    setCfg((c) => {
                      const overrides = { ...(c.overrides ?? {}) };
                      delete overrides[q.id];
                      return { ...c, overrides };
                    });
                  }}
                >
                  Reset
                </button>
              )}
            </>
          )}
        </div>
        {isEditing && (
          <div className="metabox" style={{ marginTop: 8 }}>
            <span className="lbl">Question text</span>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                if (custom) setCustom(q.id, { label: e.target.value });
                else setOverride(q.id, { label: e.target.value === q.label ? undefined : e.target.value });
              }}
            />
            <OptionsEditor
              options={options}
              onChange={(opts) => {
                if (custom) setCustom(q.id, { options: opts });
                else setOverride(q.id, { options: opts });
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <TopBar title="Checklist settings" back="/" right={<span style={{ fontSize: 12 }}>{saveState}</span>} />
      <div className="shell">
        <div className="banner">
          Weight each question by how much it matters to you, hide what&apos;s irrelevant, edit
          wording/options, or add your own. Scores use the weighted average; unanswered questions
          count at the neutral midpoint.
        </div>
        {SECTIONS.map((s) => {
          const customQs = (cfg.custom ?? []).filter((c) => c.sectionId === s.id);
          const open = openSection === s.id;
          return (
            <div className="acc" key={s.id}>
              <button type="button" className="acc-head" onClick={() => setOpenSection(open ? null : s.id)}>
                <span>{s.emoji}</span>
                <span>{s.title}</span>
                <span className="prog">
                  {s.questions.length + customQs.length} questions {open ? "▾" : "▸"}
                </span>
              </button>
              {open && (
                <div className="acc-body">
                  {s.questions.map((q) => renderRow(q))}
                  {customQs.map((c) => renderRow(c, c))}
                  <div style={{ paddingTop: 10 }}>
                    <button type="button" className="btn ghost" onClick={() => addCustom(s.id)}>
                      + Add question to {s.title}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="btn danger block"
          style={{ margin: "14px 0" }}
          onClick={() => {
            if (!confirm("Reset the entire checklist to defaults? Custom questions will be deleted.")) return;
            dirty.current = true;
            setCfg({ overrides: {}, custom: [] });
          }}
        >
          Reset everything to defaults
        </button>
      </div>
    </>
  );
}
