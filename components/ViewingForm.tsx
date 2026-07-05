"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GENERAL_SECTION_ID,
  SECTIONS,
  overallScore,
  scoreColor,
  sectionProgress,
  sectionScore,
} from "@/lib/checklist";
import type { Section } from "@/lib/checklist";
import {
  FACINGS,
  FLOOR_BANDS,
  STATUS_LABELS,
  defaultAreaBasis,
  harmonizedPsf,
  harmonizedSqft,
  psf,
  type Viewing,
  type ViewingStatus,
} from "@/lib/types";
import { deleteViewing, saveViewing } from "@/lib/store";
import { prefillAnswers } from "@/lib/prefill";
import ChipGroup from "./ChipGroup";
import CondoSearch from "./CondoSearch";
import MarketCard from "./MarketCard";
import PhotoGrid from "./PhotoGrid";
import ScoreBadge from "./ScoreBadge";

const BED_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 5 ? "5+" : String(n) }));
const BATH_OPTIONS = [1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 4 ? "4+" : String(n) }));

type Update = (patch: Partial<Viewing> | ((v: Viewing) => Partial<Viewing>)) => void;

function SectionCard({
  section,
  viewing,
  update,
}: {
  section: Section;
  viewing: Viewing;
  update: Update;
}) {
  const [open, setOpen] = useState(false);
  const { done, total } = sectionProgress(section, viewing.answers);
  const score = sectionScore(section, viewing.answers);

  return (
    <div className="acc">
      <button type="button" className="acc-head" onClick={() => setOpen(!open)}>
        <span>{section.emoji}</span>
        <span>{section.title}</span>
        <span className="prog">
          {score !== null && (
            <span className="score-pill" style={{ background: scoreColor(score), marginRight: 8 }}>
              {score}
            </span>
          )}
          {done}/{total} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="acc-body">
          {section.questions.map((q) => (
            <div className="q" key={q.id}>
              <div className="qlabel">{q.label}</div>
              {q.tip && <div className="tip">💡 {q.tip}</div>}
              <ChipGroup
                options={q.options}
                value={viewing.answers[q.id]}
                colorByScore
                onChange={(val) =>
                  update((cur) => {
                    const answers = { ...cur.answers };
                    if (val) answers[q.id] = val;
                    else delete answers[q.id];
                    return { answers };
                  })
                }
              />
            </div>
          ))}
          <div className="q">
            <div className="qlabel">Notes — {section.title}</div>
            <textarea
              placeholder="Anything specific… (e.g. water stain above master bed window)"
              value={viewing.sectionNotes[section.id] ?? ""}
              onChange={(e) =>
                update((cur) => ({
                  sectionNotes: { ...cur.sectionNotes, [section.id]: e.target.value },
                }))
              }
            />
            <div className="spacer" />
            <div className="lbl">Photos</div>
            <PhotoGrid
              viewingId={viewing.id}
              sectionId={section.id}
              photos={viewing.photos}
              onChange={(photos) => update({ photos })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViewingForm({ initial, isNew }: { initial: Viewing; isNew: boolean }) {
  const router = useRouter();
  const [viewing, setViewing] = useState<Viewing>(initial);
  const [prefilled, setPrefilled] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const update: Update = (patch) => {
    dirty.current = true;
    setViewing((v) => ({ ...v, ...(typeof patch === "function" ? patch(v) : patch) }));
  };

  // Debounced autosave once the record is identifiable
  useEffect(() => {
    if (!dirty.current) return;
    if (!viewing.condoName.trim() && !viewing.block.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      await saveViewing(viewing);
      setSaveState("saved");
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [viewing]);

  async function saveAndExit() {
    if (timer.current) clearTimeout(timer.current);
    await saveViewing(viewing);
    router.push("/");
  }

  async function remove() {
    if (!confirm(`Delete the viewing at ${viewing.condoName || "this unit"}? This cannot be undone.`)) return;
    await deleteViewing(viewing);
    router.push("/");
  }

  const score = overallScore(viewing.answers);

  return (
    <div className="shell">
      {/* Property */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ flex: 1, marginBottom: 0 }}>🏢 Property</h2>
          <ScoreBadge score={score} />
        </div>
        <div className="spacer" />
        <label className="field">
          <span className="lbl">Condo / project name</span>
          <CondoSearch
            value={viewing.condoName}
            onPick={(name, entry) => {
              if (!entry) {
                update({ condoName: name });
                return;
              }
              update((cur) => {
                const { answers, added } = prefillAnswers(entry, cur.answers);
                setPrefilled(added);
                return {
                  condoName: name,
                  district: entry.district,
                  area: entry.area,
                  tenure: entry.tenure,
                  topYear: entry.top,
                  areaBasis: defaultAreaBasis(entry.top),
                  answers,
                  condoMeta: {
                    mrt: entry.mrt,
                    mrtWalkMins: entry.mrtWalkMins,
                    facilities: entry.facilities,
                    schools1km: entry.schools1km,
                    intlSchools: entry.intlSchools,
                    rentalYieldPct: entry.rentalYieldPct,
                    maintFeeBand: entry.maintFeeBand,
                    enbloc: entry.enbloc,
                    carpark: entry.carpark,
                    evCharging: entry.evCharging,
                  },
                };
              });
            }}
          />
        </label>
        {viewing.district && (
          <div className="muted" style={{ marginTop: -4, marginBottom: 8 }}>
            Linked: D{viewing.district} · {viewing.area} · {viewing.tenure} · TOP {viewing.topYear}
          </div>
        )}
        {viewing.condoMeta && (viewing.condoMeta.mrt || viewing.condoMeta.facilities?.length) ? (
          <div className="metabox">
            <div className="lbl">Auto-filled property info (indicative — verify on site)</div>
            {viewing.condoMeta.mrt && (
              <div className="metarow">
                🚇 <strong>{viewing.condoMeta.mrt}</strong>
                {viewing.condoMeta.mrtWalkMins ? ` · ~${viewing.condoMeta.mrtWalkMins} min walk` : ""}
              </div>
            )}
            {viewing.condoMeta.rentalYieldPct ? (
              <div className="metarow">📈 Indicative gross rental yield ~{viewing.condoMeta.rentalYieldPct}%</div>
            ) : null}
            {viewing.condoMeta.maintFeeBand ? (
              <div className="metarow">
                🧾 Maintenance fee: {viewing.condoMeta.maintFeeBand}
                {viewing.condoMeta.enbloc && viewing.condoMeta.enbloc !== "none"
                  ? ` · En-bloc: ${viewing.condoMeta.enbloc}`
                  : ""}
              </div>
            ) : null}
            {viewing.condoMeta.carpark ? (
              <div className="metarow">
                🚗 Carpark: {viewing.condoMeta.carpark}
                {viewing.condoMeta.evCharging ? ` · EV charging: ${viewing.condoMeta.evCharging}` : ""}
              </div>
            ) : null}
            {viewing.condoMeta.facilities?.length ? (
              <div className="metarow">🏊 {viewing.condoMeta.facilities.join(" · ")}</div>
            ) : null}
            {viewing.condoMeta.schools1km?.length ? (
              <div className="metarow">🏫 Within 1km: {viewing.condoMeta.schools1km.join(", ")}</div>
            ) : null}
            {viewing.condoMeta.intlSchools?.length ? (
              <div className="metarow">🌍 Intl/private nearby: {viewing.condoMeta.intlSchools.join(", ")}</div>
            ) : null}
          </div>
        ) : null}
        <div className="row2">
          <label className="field">
            <span className="lbl">Block</span>
            <input
              type="text"
              placeholder="e.g. 12A"
              value={viewing.block}
              onChange={(e) => update({ block: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="lbl">Unit</span>
            <input
              type="text"
              placeholder="e.g. #12-08"
              value={viewing.unit}
              onChange={(e) => update({ unit: e.target.value })}
            />
          </label>
        </div>
        <div className="row2">
          <label className="field">
            <span className="lbl">Viewing date</span>
            <input
              type="date"
              value={viewing.viewingDate}
              onChange={(e) => update({ viewingDate: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="lbl">Status</span>
            <select
              value={viewing.status}
              onChange={(e) => update({ status: e.target.value as ViewingStatus })}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Unit facts */}
      <div className="card">
        <h2>📋 Unit facts</h2>
        <div className="field">
          <span className="lbl">Floor</span>
          <ChipGroup
            options={FLOOR_BANDS}
            value={viewing.floorBand}
            onChange={(v) => update({ floorBand: v })}
          />
        </div>
        <div className="field">
          <span className="lbl">Bedrooms</span>
          <ChipGroup
            options={BED_OPTIONS}
            value={viewing.bedrooms ? String(viewing.bedrooms) : undefined}
            onChange={(v) => update({ bedrooms: v ? Number(v) : undefined })}
          />
        </div>
        <div className="field">
          <span className="lbl">Bathrooms</span>
          <ChipGroup
            options={BATH_OPTIONS}
            value={viewing.bathrooms ? String(viewing.bathrooms) : undefined}
            onChange={(v) => update({ bathrooms: v ? Number(v) : undefined })}
          />
        </div>
        <div className="row2">
          <label className="field">
            <span className="lbl">Size (sqft)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1076"
              value={viewing.sizeSqft ?? ""}
              onChange={(e) => update({ sizeSqft: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <label className="field">
            <span className="lbl">Asking price (S$)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1580000"
              value={viewing.askingPrice ?? ""}
              onChange={(e) =>
                update({ askingPrice: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
        </div>
        {viewing.sizeSqft ? (
          <div className="field">
            <span className="lbl">
              Listed area convention{" "}
              <span title="Since 1 Jun 2023 (GFA harmonization), strata area excludes AC ledges and voids. Older projects include them — typically 4-7% of the listed area, sometimes 10%+ with planters/bay windows.">
                ⓘ
              </span>
            </span>
            <ChipGroup
              options={[
                { value: "pre2023", label: "Pre-harmonization (incl. AC ledge)" },
                { value: "post2023", label: "Post-2023 (harmonized)" },
              ]}
              value={viewing.areaBasis ?? "pre2023"}
              onChange={(v) => update({ areaBasis: (v || "pre2023") as Viewing["areaBasis"] })}
            />
            {(viewing.areaBasis ?? "pre2023") === "pre2023" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Conversion factor ÷
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="1.2"
                  inputMode="decimal"
                  style={{ width: 90 }}
                  value={viewing.harmFactor ?? 1.07}
                  onChange={(e) =>
                    update({ harmFactor: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
                <span className="muted" style={{ fontSize: 12.5 }}>
                  ≈ {harmonizedSqft(viewing)?.toLocaleString()} sqft harmonized
                </span>
              </div>
            )}
          </div>
        ) : null}
        {viewing.askingPrice && viewing.sizeSqft ? (
          <div className="metabox" style={{ marginTop: 4 }}>
            <div className="metarow">
              💵 ${Math.round(viewing.askingPrice / viewing.sizeSqft).toLocaleString()} psf as
              listed
            </div>
            {harmonizedPsf(viewing) !== psf(viewing) && (
              <div className="metarow">
                ⚖️ <strong>${harmonizedPsf(viewing)?.toLocaleString()} psf harmonized</strong> —
                use this to compare against post-2023 projects
              </div>
            )}
          </div>
        ) : null}
        <div className="field">
          <span className="lbl">Main facing</span>
          <ChipGroup
            options={FACINGS.map((f) => ({ value: f, label: f }))}
            value={viewing.facing}
            onChange={(v) => update({ facing: v || undefined })}
          />
        </div>
        <label className="field">
          <span className="lbl">Availability / possession</span>
          <input
            type="text"
            placeholder="e.g. vacant, or tenanted until Mar 2027"
            value={viewing.availability ?? ""}
            onChange={(e) => update({ availability: e.target.value })}
          />
        </label>
      </div>

      {/* Market data from URA */}
      <MarketCard
        condoName={viewing.condoName}
        district={viewing.district}
        sqft={viewing.sizeSqft}
        askingPrice={viewing.askingPrice}
      />

      {/* Checklist */}
      <h2 className="pagetitle">Checklist</h2>
      <p className="muted">Tap through each section — answers are one tap, notes optional.</p>
      {prefilled > 0 && (
        <div className="banner">
          ✨ {prefilled} answer{prefilled > 1 ? "s" : ""} pre-filled from the condo database
          (facilities, fees, location, price &amp; deal). They can be wrong — tap any chip to
          correct it.
        </div>
      )}
      {SECTIONS.map((s) => (
        <SectionCard key={s.id} section={s} viewing={viewing} update={update} />
      ))}

      {/* Agent */}
      <div className="card">
        <h2>🧑‍💼 Agent</h2>
        <div className="row2">
          <label className="field">
            <span className="lbl">Name</span>
            <input
              type="text"
              value={viewing.agent.name}
              onChange={(e) => update({ agent: { ...viewing.agent, name: e.target.value } })}
            />
          </label>
          <label className="field">
            <span className="lbl">Agency</span>
            <input
              type="text"
              placeholder="e.g. PropNex"
              value={viewing.agent.agency}
              onChange={(e) => update({ agent: { ...viewing.agent, agency: e.target.value } })}
            />
          </label>
        </div>
        <div className="row2">
          <label className="field">
            <span className="lbl">Phone</span>
            <input
              type="tel"
              placeholder="+65…"
              value={viewing.agent.phone}
              onChange={(e) => update({ agent: { ...viewing.agent, phone: e.target.value } })}
            />
          </label>
          <label className="field">
            <span className="lbl">CEA reg. no.</span>
            <input
              type="text"
              placeholder="e.g. R012345A"
              value={viewing.agent.ceaNo}
              onChange={(e) => update({ agent: { ...viewing.agent, ceaNo: e.target.value } })}
            />
          </label>
        </div>
        <label className="field">
          <span className="lbl">Agent notes</span>
          <textarea
            placeholder="Responsiveness, what they said about the seller…"
            value={viewing.agent.notes}
            onChange={(e) => update({ agent: { ...viewing.agent, notes: e.target.value } })}
          />
        </label>
      </div>

      {/* General notes + photos */}
      <div className="card">
        <h2>📝 Additional notes</h2>
        <textarea
          placeholder="Overall impressions, gut feel, follow-ups to ask…"
          style={{ minHeight: 110 }}
          value={viewing.generalNotes}
          onChange={(e) => update({ generalNotes: e.target.value })}
        />
        <div className="spacer" />
        <div className="lbl">Photos</div>
        <PhotoGrid
          viewingId={viewing.id}
          sectionId={GENERAL_SECTION_ID}
          photos={viewing.photos}
          onChange={(photos) => update({ photos })}
        />
      </div>

      <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
        <button type="button" className="btn primary block" onClick={saveAndExit}>
          {saveState === "saving" ? "Saving…" : "Save & close"}
        </button>
        {!isNew && (
          <button type="button" className="btn danger" onClick={remove}>
            Delete
          </button>
        )}
      </div>
      <p className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
        {saveState === "saved" ? "All changes saved ✓" : saveState === "saving" ? "Saving…" : " "}
      </p>
    </div>
  );
}
