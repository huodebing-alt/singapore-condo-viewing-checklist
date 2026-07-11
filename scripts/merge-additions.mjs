// Merge data/additions/*.json into data/condos.json with dedupe + validation.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const condos = JSON.parse(readFileSync(`${root}data/condos.json`, "utf8"));

const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
// also catch "THE X" vs "X" near-duplicates
const fuzzy = (s) => norm(s).replace(/^THE/, "");

const FEE = ["low", "medium", "high"];
const EB = ["none", "rumoured", "active", "failed"];
const CP = ["ample", "ok", "tight"];
const EV = ["yes", "planned", "no"];

const seen = new Map(condos.map((c) => [norm(c.name), c.name]));
const seenFuzzy = new Map(condos.map((c) => [fuzzy(c.name), c.name]));

let added = 0;
const rejected = [];
const suspects = [];

for (const file of readdirSync(`${root}data/additions`).sort()) {
  if (!file.endsWith(".json")) continue;
  const entries = JSON.parse(readFileSync(`${root}data/additions/${file}`, "utf8"));
  for (const e of entries) {
    const reasons = [];
    if (!e.name || typeof e.name !== "string") reasons.push("no name");
    if (!Number.isInteger(e.district) || e.district < 1 || e.district > 28) reasons.push("bad district");
    if (typeof e.area !== "string" || !e.area) reasons.push("bad area");
    if (typeof e.tenure !== "string" || !e.tenure) reasons.push("bad tenure");
    if (!Number.isInteger(e.top) || e.top < 1960 || e.top > 2032) reasons.push("bad top");
    if (e.maintFeeBand && !FEE.includes(e.maintFeeBand)) reasons.push("bad fee");
    if (e.enbloc && !EB.includes(e.enbloc)) reasons.push("bad enbloc");
    if (e.carpark && !CP.includes(e.carpark)) reasons.push("bad carpark");
    if (e.evCharging && !EV.includes(e.evCharging)) reasons.push("bad ev");
    if (e.rentalYieldPct !== undefined && (typeof e.rentalYieldPct !== "number" || e.rentalYieldPct < 1 || e.rentalYieldPct > 7)) reasons.push("bad yield");
    if (reasons.length) {
      rejected.push(`${file}: ${e.name ?? "?"} (${reasons.join(", ")})`);
      continue;
    }
    const k = norm(e.name);
    if (seen.has(k)) {
      rejected.push(`${file}: ${e.name} (duplicate of "${seen.get(k)}")`);
      continue;
    }
    const fk = fuzzy(e.name);
    if (seenFuzzy.has(fk) && seenFuzzy.get(fk) !== e.name) {
      suspects.push(`${e.name} ~ existing "${seenFuzzy.get(fk)}" (kept both — check)`);
    }
    seen.set(k, e.name);
    seenFuzzy.set(fk, e.name);
    condos.push({
      name: e.name, district: e.district, area: e.area, tenure: e.tenure, top: e.top,
      mrt: e.mrt, mrtWalkMins: e.mrtWalkMins, facilities: e.facilities ?? [],
      schools1km: e.schools1km ?? [], intlSchools: e.intlSchools ?? [],
      rentalYieldPct: e.rentalYieldPct, maintFeeBand: e.maintFeeBand, enbloc: e.enbloc,
      carpark: e.carpark, evCharging: e.evCharging,
    });
    added++;
  }
}

condos.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(`${root}data/condos.json`, JSON.stringify(condos, null, 1));

const byDistrict = {};
for (const c of condos) byDistrict[c.district] = (byDistrict[c.district] ?? 0) + 1;
console.log(`added ${added}, total ${condos.length}`);
console.log("per district:", Object.entries(byDistrict).map(([d, n]) => `D${d}:${n}`).join(" "));
if (rejected.length) console.log(`\nrejected ${rejected.length}:\n` + rejected.join("\n"));
if (suspects.length) console.log(`\nnear-duplicate suspects:\n` + suspects.join("\n"));
