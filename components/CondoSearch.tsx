"use client";

import { useMemo, useState } from "react";
import condosData from "@/data/condos.json";
import type { CondoEntry } from "@/lib/types";

const CONDOS = condosData as CondoEntry[];

export default function CondoSearch({
  value,
  onPick,
}: {
  value: string;
  onPick: (name: string, entry?: CondoEntry) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return CONDOS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.area.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query]);

  return (
    <div className="condosearch">
      <input
        type="search"
        placeholder="Search condo name or area…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onPick(e.target.value); // keep as custom name while typing
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && matches.length > 0 && (
        <div className="results">
          {matches.map((c) => (
            <button
              key={c.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery(c.name);
                setOpen(false);
                onPick(c.name, c);
              }}
            >
              <div>{c.name}</div>
              <div className="meta">
                D{c.district} · {c.area} · {c.tenure} · TOP {c.top}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
