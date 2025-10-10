"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

/* ======================= Types ======================= */
type Slot = "Head" | "Body" | "Hand" | "Foot" | "Weapon" | "Accessory";

type RawItem = {
  ["Item Name"]: string;
  Gender?: string | null;
  Attack?: number | null;
  Defense?: number | null;
  Disguise?: number | null;
  [k: string]: any;
};

type Skill = { name: string; value: number };
type Effect = { name: string; value: number };

type EquipItem = {
  name: string;
  slug: string;
  slot: Slot;
  gender: string;
  attack: number;
  defense: number;
  disguise: number;
  skills: Skill[];
  effects: Effect[];
};

type Loadout = Partial<Record<Slot, EquipItem>>;

/* ======================= Constants ======================= */
const DATA_SOURCES: Record<Slot, string[]> = {
  Head: ["/data/equipment_head.json"],
  Body: ["/data/equipment_body.json"],
  Hand: ["/data/equipment_hand.json"],
  Foot: ["/data/equipment_shoes.json", "/data/equipment_foot.json"],
  Weapon: ["/data/equipment_weapons.json", "/data/equipment_weapon.json"],
  Accessory: ["/data/equipment_acessories.json", "/data/equipment_accessories.json"],
};

const SLOTS: Slot[] = ["Head", "Body", "Hand", "Foot", "Weapon", "Accessory"];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "slot", label: "Slot" },
  { value: "attack", label: "Attack" },
  { value: "defense", label: "Defense" },
  { value: "disguise", label: "Disguise" },
  { value: "skillCount", label: "Skills Count" },
  { value: "effectCount", label: "Effects Count" },
] as const;

/* ======================= Utils ======================= */
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function num(n: any, d = 0) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : d;
}
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function parseSkills(raw: RawItem): Skill[] {
  const out: Skill[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (!/^skill\s*\d+/i.test(k)) continue;
    if (!v) continue;
    const s = String(v).trim();
    const m = s.match(/^(.*?)(?:\s*\[\s*([+\-]?\d+(?:\.\d+)?)\s*\])?$/);
    if (!m) continue;
    const name = (m[1] || s).trim();
    const value = m[2] ? Number(m[2]) : 0;
    if (name) out.push({ name, value: Number.isFinite(value) ? value : 0 });
  }
  return out;
}

function parseEffects(raw: RawItem): Effect[] {
  const out: Effect[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (!/^effect\s*\d+/i.test(k)) continue;
    if (!v) continue;
    const s = String(v).trim();
    const m = s.match(/^(.*?)(?:\s*\[\s*([+\-]?\d+(?:\.\d+)?)\s*\])?$/);
    if (!m) continue;
    const name = (m[1] || s).trim();
    const value = m[2] ? Number(m[2]) : 0;
    if (name) out.push({ name, value: Number.isFinite(value) ? value : 0 });
  }
  return out;
}

async function fetchJSON(path: string) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (r.ok) return r.json();
  } catch {}
  return null;
}
async function fetchFirstJSON(paths: string[]) {
  for (const p of paths) {
    const j = await fetchJSON(p);
    if (j) return j;
  }
  return null;
}

function normalize(rawArr: RawItem[], slot: Slot): EquipItem[] {
  return (rawArr || []).map((raw) => {
    const name = String(raw["Item Name"] || "").trim();
    const gender = String(raw.Gender ?? "").trim() || "—";
    const attack = num(raw.Attack);
    const defense = num(raw.Defense);
    const disguise = num(raw.Disguise);
    const skills = parseSkills(raw);
    const effects = parseEffects(raw);
    return {
      name,
      slug: slugify(name || `${slot}-item`),
      slot,
      gender,
      attack,
      defense,
      disguise,
      skills,
      effects,
    };
  });
}

/* ======================= Page ======================= */
export default function EquipmentPage() {
  const [items, setItems] = useState<EquipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Search & filters
  const [q, setQ] = useState("");
  const [slotFilters, setSlotFilters] = useState<Set<Slot>>(new Set()); // empty => all
  const [genderFilter, setGenderFilter] = useState<"any" | "M" | "F" | "Unisex">("any");
  const [hasEffectOnly, setHasEffectOnly] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const [minAtk, setMinAtk] = useState<number | "">("");
  const [minDef, setMinDef] = useState<number | "">("");
  const [minDis, setMinDis] = useState<number | "">("");
  const [sortKey, setSortKey] = useState<(typeof SORT_OPTIONS)[number]["value"]>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Loadout calculator
  const [loadout, setLoadout] = useState<Loadout>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const all: EquipItem[] = [];

        for (const slot of SLOTS) {
          const j = await fetchFirstJSON(DATA_SOURCES[slot]);
          if (Array.isArray(j)) {
            all.push(...normalize(j as RawItem[], slot));
          }
        }
        if (!cancelled) setItems(all);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load equipment data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const uniqueSkills = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => it.skills.forEach((sk) => s.add(sk.name)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Filtering + sorting
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    const skq = skillQuery.trim().toLowerCase();

    const filtered = items.filter((it) => {
      // text search: item name, slot, gender, skills, effects
      const hay = `${it.name} ${it.slot} ${it.gender} ${it.skills.map((s) => s.name).join(" ")} ${it.effects
        .map((e) => e.name)
        .join(" ")}`.toLowerCase();
      if (t && !hay.includes(t)) return false;

      // slot filter
      if (slotFilters.size > 0 && !slotFilters.has(it.slot)) return false;

      // gender filter
      if (genderFilter !== "any") {
        if (genderFilter === "Unisex") {
          const uni = /m\s*\/\s*f/i.test(it.gender) || /unisex/i.test(it.gender) || /M\s*&\s*F/i.test(it.gender);
          if (!uni) return false;
        } else {
          if (!new RegExp(`\\b${genderFilter}\\b`, "i").test(it.gender)) return false;
        }
      }

      // effect toggle
      if (hasEffectOnly && it.effects.length === 0) return false;

      // skill query
      if (skq && !it.skills.some((s) => s.name.toLowerCase().includes(skq))) return false;

      // stat minimums
      if (minAtk !== "" && it.attack < Number(minAtk)) return false;
      if (minDef !== "" && it.defense < Number(minDef)) return false;
      if (minDis !== "" && it.disguise < Number(minDis)) return false;

      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const slotRank: Record<Slot, number> = { Head: 0, Body: 1, Hand: 2, Foot: 3, Weapon: 4, Accessory: 5 };

    const valOf = (it: EquipItem) => {
      switch (sortKey) {
        case "name":
          return it.name;
        case "slot":
          return slotRank[it.slot];
        case "attack":
          return it.attack;
        case "defense":
          return it.defense;
        case "disguise":
          return it.disguise;
        case "skillCount":
          return it.skills.length;
        case "effectCount":
          return it.effects.length;
        default:
          return it.name;
      }
    };

    return filtered.sort((a, b) => {
      const va: any = valOf(a);
      const vb: any = valOf(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [items, q, slotFilters, genderFilter, hasEffectOnly, skillQuery, minAtk, minDef, minDis, sortKey, sortDir]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (q.trim()) c++;
    if (slotFilters.size > 0) c++;
    if (genderFilter !== "any") c++;
    if (hasEffectOnly) c++;
    if (skillQuery.trim()) c++;
    if (minAtk !== "" || minDef !== "" || minDis !== "") c++;
    return c;
  }, [q, slotFilters, genderFilter, hasEffectOnly, skillQuery, minAtk, minDef, minDis]);

  const resetFilters = () => {
    setQ("");
    setSlotFilters(new Set());
    setGenderFilter("any");
    setHasEffectOnly(false);
    setSkillQuery("");
    setMinAtk("");
    setMinDef("");
    setMinDis("");
    setSortKey("name");
    setSortDir("asc");
  };

  /* ====== Loadout derived ====== */
  const totals = useMemo(() => {
    const arr = SLOTS.map((s) => loadout[s]).filter(Boolean) as EquipItem[];
    const attack = arr.reduce((a, x) => a + x.attack, 0);
    const defense = arr.reduce((a, x) => a + x.defense, 0);
    const disguise = arr.reduce((a, x) => a + x.disguise, 0);

    const skillMap = new Map<string, number>();
    arr.forEach((it) =>
      it.skills.forEach((s) => skillMap.set(s.name, (skillMap.get(s.name) || 0) + (Number(s.value) || 0)))
    );
    const skills = Array.from(skillMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    const effMap = new Map<string, number>();
    arr.forEach((it) =>
      it.effects.forEach((e) => effMap.set(e.name, (effMap.get(e.name) || 0) + (Number(e.value) || 0)))
    );
    const effects = Array.from(effMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    return { attack, defense, disguise, skills, effects };
  }, [loadout]);

  const addToLoadout = (it: EquipItem) => setLoadout((prev) => ({ ...prev, [it.slot]: it }));
  const clearSlot = (slot: Slot) => setLoadout((p) => ({ ...p, [slot]: undefined }));
  const clearAll = () => setLoadout({});

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
            <p className="mt-1 text-slate-400">
              Browse all gear slots in one place. Pick a loadout to see combined boosts.
            </p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, skill, effect…"
              className="w-full rounded-2xl bg-slate-900/60 px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Filters */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Slots */}
              <div className="mt-4">
                <div className="text-xs font-medium text-slate-400">Slots</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SLOTS.map((s) => {
                    const active = slotFilters.has(s);
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          const next = new Set(slotFilters);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          setSlotFilters(next);
                        }}
                        className={classNames(
                          "px-3 py-1.5 rounded-full text-xs border transition",
                          active
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gender */}
              <div className="mt-5">
                <div className="text-xs font-medium text-slate-400">Gender</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["any", "M", "F", "Unisex"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={classNames(
                        "px-3 py-1.5 rounded-xl text-xs border transition",
                        genderFilter === g
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                          : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                      )}
                    >
                      {g === "any" ? "Any" : g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill name contains */}
              <div className="mt-5">
                <label className="text-xs text-slate-400">Skill contains</label>
                <input
                  value={skillQuery}
                  onChange={(e) => setSkillQuery(e.target.value)}
                  placeholder="e.g., Swordplay"
                  className="mt-2 w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  list="skills-list"
                />
                <datalist id="skills-list">
                  {uniqueSkills.slice(0, 1000).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Has effect toggle */}
              <div className="mt-5 flex items-center justify-between">
                <label className="text-xs text-slate-400">Has Effect</label>
                <input
                  type="checkbox"
                  checked={hasEffectOnly}
                  onChange={(e) => setHasEffectOnly(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
              </div>

              {/* Stat minimums */}
              <div className="mt-5">
                <div className="text-xs text-slate-400">Minimum Stats</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Atk"
                    value={minAtk}
                    onChange={(e) => setMinAtk(e.target.value === "" ? "" : Number(e.target.value))}
                    className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Def"
                    value={minDef}
                    onChange={(e) => setMinDef(e.target.value === "" ? "" : Number(e.target.value))}
                    className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Disg"
                    value={minDis}
                    onChange={(e) => setMinDis(e.target.value === "" ? "" : Number(e.target.value))}
                    className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sort</div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as any)}
                    className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as any)}
                    className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results + Loadout */}
          <div className="lg:col-span-9">
            {/* Top bar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-400">
                {loading ? (
                  "Loading…"
                ) : err ? (
                  <span className="text-rose-400">{err}</span>
                ) : (
                  <>
                    Showing <span className="text-slate-200 font-medium">{visible.length}</span> of {items.length}
                    {activeFiltersCount > 0 && <span> (filters active)</span>}
                  </>
                )}
              </div>

              {/* Quick sort on small screens */}
              <div className="lg:hidden">
                <label className="sr-only" htmlFor="mobile-sort">
                  Sort
                </label>
                <select
                  id="mobile-sort"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as any)}
                  className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loadout Calculator (sticky on large screens) */}
            <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/60"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200">Loadout Calculator</h3>
                  <button
                    onClick={clearAll}
                    className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                    disabled={Object.values(loadout).filter(Boolean).length === 0}
                  >
                    Clear all
                  </button>
                </div>

                <div className="p-4">
                  {/* Selected slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {SLOTS.map((s) => {
                      const it = loadout[s];
                      return (
                        <div
                          key={s}
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex flex-col gap-2"
                        >
                          <div className="text-[10px] uppercase tracking-wider text-slate-400">{s}</div>
                          {it ? (
                            <>
                              <div className="text-sm font-medium text-slate-100 line-clamp-2" title={it.name}>
                                {it.name}
                              </div>
                              <button
                                onClick={() => clearSlot(s)}
                                className="text-xs text-rose-300 hover:text-rose-200 self-start"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-slate-500">Not selected</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Attack</div>
                      <div className="text-lg font-semibold text-slate-100">{totals.attack}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Defense</div>
                      <div className="text-lg font-semibold text-slate-100">{totals.defense}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Disguise</div>
                      <div className="text-lg font-semibold text-slate-100">{totals.disguise}</div>
                    </div>
                  </div>

                  {/* Merged skills / effects */}
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-xs font-semibold text-slate-300">Skill Boosts</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {totals.skills.length === 0 ? (
                          <div className="text-xs text-slate-500">—</div>
                        ) : (
                          totals.skills.slice(0, 60).map((s) => (
                            <span
                              key={s.name}
                              className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300 ring-1 ring-indigo-500/30"
                              title={`${s.name} +${s.value}`}
                            >
                              {s.name} <span className="ml-1 font-semibold">+{s.value}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-xs font-semibold text-slate-300">Effects</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {totals.effects.length === 0 ? (
                          <div className="text-xs text-slate-500">—</div>
                        ) : (
                          totals.effects.slice(0, 60).map((e) => (
                            <span
                              key={e.name}
                              className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30"
                              title={`${e.name}${e.value ? ` [${e.value}]` : ""}`}
                            >
                              {e.name}
                              {e.value ? <span className="ml-1 font-semibold">[{e.value}]</span> : null}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((it, i) => (
                <motion.article
                  key={`${it.slug}-${i}`} // avoid duplicate key crashes for same name variants
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm hover:shadow-md hover:border-slate-700"
                >
                  <CardHeader item={it} />
                  <CardBody item={it} onAdd={() => addToLoadout(it)} />
                </motion.article>
              ))}
            </div>

            {/* Empty state */}
            {!loading && !err && visible.length === 0 && (
              <div className="mt-16 text-center text-slate-400">
                <p className="text-lg">No equipment matches your filters.</p>
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================= Card Pieces ======================= */
function StatChip({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className="text-sm font-medium text-slate-100">{Number.isFinite(v) ? v : 0}</div>
    </div>
  );
}

function CardHeader({ item }: { item: EquipItem }) {
  const typeTone =
    item.slot === "Weapon"
      ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
      : item.slot === "Accessory"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
      : "bg-sky-500/10 text-sky-300 ring-sky-500/30";

  return (
    <div className="flex items-start gap-3 p-4">
      {/* simple slot badge – no image */}
      <div className="grid place-items-center h-12 w-12 shrink-0 rounded-xl border border-slate-800 bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400">
        {item.slot[0]}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-slate-100" title={item.name}>
          {item.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${typeTone}`}>
            {item.slot}
          </span>
          {item.gender && (
            <span className="inline-flex items-center rounded-full bg-fuchsia-500/10 px-2.5 py-0.5 text-xs text-fuchsia-300 ring-1 ring-fuchsia-500/30">
              {item.gender}
            </span>
          )}
          {item.effects.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
              {item.effects.length} Effect{item.effects.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardBody({ item, onAdd }: { item: EquipItem; onAdd: () => void }) {
  return (
    <div className="px-4 pb-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatChip k="Attack" v={item.attack} />
        <StatChip k="Defense" v={item.defense} />
        <StatChip k="Disguise" v={item.disguise} />
      </div>

      {/* Skills */}
      {item.skills.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Skills</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {item.skills.map((s, i) => (
              <span
                key={`${item.slug}-skill-${i}-${s.name}`}
                className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300 ring-1 ring-indigo-500/30"
              >
                {s.name} {s.value ? <span className="ml-1 font-semibold">+{s.value}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Effects */}
      {item.effects.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Effects</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {item.effects.map((e, i) => (
              <span
                key={`${item.slug}-effect-${i}-${e.name}`}
                className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30"
                title={`${e.name}${e.value ? ` [${e.value}]` : ""}`}
              >
                {e.name}
                {e.value ? <span className="ml-1 font-semibold">[{e.value}]</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add to loadout */}
      <div className="mt-4">
        <button
          onClick={onAdd}
          className="cursor-pointer w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          title={`Select as ${item.slot}`}
        >
          Add as {item.slot}
        </button>
      </div>
    </div>
  );
}