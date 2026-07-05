"use client";

import type { Option } from "@/lib/checklist";

export default function ChipGroup({
  options,
  value,
  onChange,
  colorByScore = false,
}: {
  options: Option[];
  value?: string;
  onChange: (v: string) => void;
  colorByScore?: boolean;
}) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value === o.value;
        const scoreClass =
          colorByScore && on && o.score !== undefined ? ` s${o.score}` : "";
        return (
          <button
            key={o.value}
            type="button"
            className={`chip${on ? " on" : ""}${scoreClass}`}
            onClick={() => onChange(on ? "" : o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
