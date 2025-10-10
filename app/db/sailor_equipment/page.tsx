"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

// --- Types ---
export type StatValue = number | null | undefined;
export type Stats = Record<string, StatValue>;

export interface SpecialEffect {
  name: string | null;
  description: string | null;
}

export interface SailorEquipment {
  name: string;
  type: string; // "Adventure" | "Trade" | "Battle" etc
  description: string;
  image_url?: string; // ignored (we rely on local images only)
  stats: Stats; // e.g., Vertical Sail, Horizontal Sail, etc.
  required_ship_skill: string | null;
  special_effect: SpecialEffect;
  slug: string;
  uid?: string; // injected after loading for stable unique React keys
}

// --- Constants ---
const DATA_URL = "/data/sailor_equipment.json"; // from public/data
const LOCAL_IMAGE_BASE = "/images/sailor_equipment_images"; // from public/images/sailor_equipment_images
const IMAGE_EXTS = [".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif"]; // try in this order
const PLACEHOLDER_IMAGE = "/images/placeholder_equipment.png"; // ensure this exists locally

// Canonical stat labels we care about for sorting / quick glance
const CORE_STAT_ORDER = [
  "Vertical Sail",
  "Horizontal Sail",
  "Turning Speed",
  "Wave Resistance",
  "Armour",
  "Durability",
];

// --- Helpers ---
function num(v: StatValue, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatStat(v: StatValue): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return String(v);
  return String(v);
}

// Normalize to a base filename: lowercase, accents removed, non-alnum -> '-'
function normalizeBase(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$|\s+/g, "");
}
function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// Build a list of candidate local image paths derived from slug and name.
function buildLocalImageCandidates(item: SailorEquipment): string[] {
  const bySlug = normalizeBase(item.slug || item.name);
  const byName = normalizeBase(item.name);
  const snakeName = byName.replace(/-/g, "_");
  const rawNameSpaced = item.name.trim(); // in case files were saved with spaces

  const bases = unique([bySlug, byName, snakeName, rawNameSpaced]);

  const candidates: string[] = [];
  for (const base of bases) {
    for (const ext of IMAGE_EXTS) {
      candidates.push(`${LOCAL_IMAGE_BASE}/${base}${ext}`);
    }
  }
  // final fallback to local placeholder only (no CDN)
  candidates.push(PLACEHOLDER_IMAGE);
  return candidates;
}

// Try candidates in order; advance on <img> onError. No CDN fallback by design.
function useLocalImage(candidates: string[]) {
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [JSON.stringify(candidates)]);
  const onError = () => setIdx((i) => (i + 1 < candidates.length ? i + 1 : i));
  const src = candidates[Math.min(idx, candidates.length - 1)] ?? PLACEHOLDER_IMAGE;
  return { src, onError };
}

// Compute a union of stat keys across all items (for filter/sort menus)
function collectAllStatKeys(items: SailorEquipment[]): string[] {
  const set = new Set<string>();
  items.forEach((it) => {
    Object.keys(it.stats || {}).forEach((k) => set.add(k));
  });
  // Keep core stats first, then the rest in alpha order
  const rest = Array.from(set)
    .filter((k) => !CORE_STAT_ORDER.includes(k))
    .sort((a, b) => a.localeCompare(b));
  return [...CORE_STAT_ORDER.filter((k) => set.has(k)), ...rest];
}

// --- Page Component ---
export default function SailorEquipmentPage() {
  const [all, setAll] = useState<SailorEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [q, setQ] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set()); // empty => all
  const [hasEffectOnly, setHasEffectOnly] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string>("any"); // "any" | "none" | specific skill name
  const [minDur, setMinDur] = useState<number | "">("");
  const [maxDur, setMaxDur] = useState<number | "">("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
        const json = (await res.json()) as SailorEquipment[];

        // Inject stable unique IDs to avoid React key collisions if slugs repeat
        const seen = new Map<string, number>();
        const withUid = json.map((it) => {
          const key = it.slug || normalizeBase(it.name);
          const next = (seen.get(key) ?? 0) + 1;
          seen.set(key, next);
          return { ...it, uid: `${key}__${next}` } as SailorEquipment;
        });

        if (!cancelled) setAll(withUid);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statKeys = useMemo(() => collectAllStatKeys(all), [all]);

  const uniqueTypes = useMemo(
    () => Array.from(new Set(all.map((x) => x.type).filter(Boolean))).sort(),
    [all]
  );
  const uniqueSkills = useMemo(() => {
    const s = new Set<string>();
    all.forEach((x) => x.required_ship_skill && s.add(x.required_ship_skill));
    return Array.from(s).sort();
  }, [all]);

  // Derived, filtered & sorted list
  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();

    let items = all.filter((it) => {
      // Search text across name, description, type, skill, effect
      const haystack = (
        `${it.name} ${it.description} ${it.type} ${it.required_ship_skill ?? ""} ${it.special_effect?.name ?? ""} ${it.special_effect?.description ?? ""}`
      ).toLowerCase();
      if (query && !haystack.includes(query)) return false;

      // Type filter
      if (typeFilters.size > 0 && !typeFilters.has(it.type)) return false;

      // Has special effect only
      if (hasEffectOnly) {
        const has = Boolean(it.special_effect?.name) || Boolean(it.special_effect?.description);
        if (!has) return false;
      }

      // Skill filter
      if (skillFilter === "none" && it.required_ship_skill) return false;
      if (skillFilter !== "any" && skillFilter !== "none" && it.required_ship_skill !== skillFilter) return false;

      // Durability range
      const dur = num(it.stats?.["Durability"], NaN);
      if (!Number.isNaN(dur)) {
        if (minDur !== "" && dur < Number(minDur)) return false;
        if (maxDur !== "" && dur > Number(maxDur)) return false;
      }

      return true;
    });

    // Sorting logic
    const dir = sortDir === "asc" ? 1 : -1;

    const getValue = (it: SailorEquipment): number | string => {
      switch (sortKey) {
        case "name":
          return it.name;
        case "type":
          return it.type;
        case "durability":
          return num(it.stats?.["Durability"], 0);
        case "totalSail":
          return num(it.stats?.["Vertical Sail"], 0) + num(it.stats?.["Horizontal Sail"], 0);
        case "hasEffect":
          return (it.special_effect?.name || it.special_effect?.description) ? 1 : 0;
        case "requiredSkill":
          return it.required_ship_skill ? 1 : 0;
        default: {
          // try treat as stat key
          if (statKeys.includes(sortKey)) return num(it.stats?.[sortKey], 0);
          return it.name;
        }
      }
    };

    items.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });

    return items;
  }, [all, q, typeFilters, hasEffectOnly, skillFilter, minDur, maxDur, sortKey, sortDir, statKeys]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (q.trim()) c++;
    if (typeFilters.size > 0) c++;
    if (hasEffectOnly) c++;
    if (skillFilter !== "any") c++;
    if (minDur !== "" || maxDur !== "") c++;
    return c;
  }, [q, typeFilters, hasEffectOnly, skillFilter, minDur, maxDur]);

  const resetFilters = () => {
    setQ("");
    setTypeFilters(new Set());
    setHasEffectOnly(false);
    setSkillFilter("any");
    setMinDur("");
    setMaxDur("");
    setSortKey("name");
    setSortDir("asc");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sailor Equipment</h1>
            <p className="mt-1 text-slate-400">Browse, filter, and sort every sailor equipment item.</p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, description, skill…"
              className="w-full rounded-2xl bg-slate-900/60 px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Filters panel */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Types */}
              <div className="mt-4">
                <div className="text-xs font-medium text-slate-400">Type</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {uniqueTypes.map((t) => {
                    const active = typeFilters.has(t);
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          const next = new Set(typeFilters);
                          if (next.has(t)) next.delete(t); else next.add(t);
                          setTypeFilters(next);
                        }}
                        className={classNames(
                          "px-3 py-1.5 rounded-full text-xs border transition",
                          active
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special effect toggle */}
              <div className="mt-5 flex items-center justify-between">
                <label className="text-xs text-slate-400">Has Special Effect</label>
                <input
                  type="checkbox"
                  checked={hasEffectOnly}
                  onChange={(e) => setHasEffectOnly(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
              </div>

              {/* Skill filter */}
              <div className="mt-5">
                <label className="text-xs text-slate-400">Required Ship Skill</label>
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="any">Any</option>
                  <option value="none">None</option>
                  {uniqueSkills.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Durability range */}
              <div className="mt-5">
                <div className="text-xs text-slate-400">Durability Range</div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minDur}
                    onChange={(e) => setMinDur(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-1/2 rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxDur}
                    onChange={(e) => setMaxDur(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-1/2 rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sort</div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="durability">Durability</option>
                    <option value="totalSail">Total Sail</option>
                    <option value="hasEffect">Has Special Effect</option>
                    <option value="requiredSkill">Has Required Skill</option>
                    {/* dynamic stat keys */}
                    {statKeys.map((k) => (
                      <option key={`stat-${k}`} value={k}>{k}</option>
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

          {/* Results */}
          <div className="lg:col-span-9">
            {/* Summary bar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-400">
                {loading ? "Loading…" : error ? (
                  <span className="text-rose-400">{error}</span>
                ) : (
                  <>
                    Showing <span className="text-slate-200 font-medium">{visible.length}</span> of {all.length}
                    {activeFiltersCount > 0 && <span> (filters active)</span>}
                  </>
                )}
              </div>
              {/* Quick sort on small screens */}
              <div className="lg:hidden">
                <label className="sr-only" htmlFor="mobile-sort">Sort</label>
                <select
                  id="mobile-sort"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="durability">Durability</option>
                  <option value="totalSail">Total Sail</option>
                  <option value="hasEffect">Has Special Effect</option>
                  <option value="requiredSkill">Has Required Skill</option>
                  {statKeys.map((k) => (
                    <option key={`mstat-${k}`} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((it) => (
                <motion.article
                  key={it.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm hover:shadow-md hover:border-slate-700"
                >
                  <CardHeader item={it} />
                  <CardBody item={it} statKeys={statKeys} />
                </motion.article>
              ))}
            </div>

            {/* Empty state */}
            {!loading && !error && visible.length === 0 && (
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

// --- Card pieces ---
function CardHeader({ item }: { item: SailorEquipment }) {
  const candidates = buildLocalImageCandidates(item);
  const { src, onError } = useLocalImage(candidates);

  return (
    <div className="flex items-start gap-3 p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          onError={onError}
          alt={item.name}
          className="h-full w-full object-contain p-2"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-slate-100">{item.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={classNames(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
            item.type === "Battle" && "bg-rose-500/10 text-rose-300 ring-rose-500/30",
            item.type === "Trade" && "bg-amber-500/10 text-amber-300 ring-amber-500/30",
            item.type === "Adventure" && "bg-sky-500/10 text-sky-300 ring-sky-500/30",
            !["Battle","Trade","Adventure"].includes(item.type) && "bg-slate-700/30 text-slate-300 ring-slate-600/40"
          )}>
            {item.type}
          </span>

          {item.required_ship_skill && (
            <span className="inline-flex items-center rounded-full bg-fuchsia-500/10 px-2.5 py-0.5 text-xs text-fuchsia-300 ring-1 ring-fuchsia-500/30">
              {item.required_ship_skill}
            </span>
          )}

          {(item.special_effect?.name || item.special_effect?.description) && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
              Special Effect
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardBody({ item, statKeys }: { item: SailorEquipment; statKeys: string[] }) {
  const description = item.description ?? "";
  const topStats = CORE_STAT_ORDER.filter((k) => statKeys.includes(k));

  return (
    <div className="px-4 pb-4">
      <p className="line-clamp-3 text-sm text-slate-400">{description}</p>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {topStats.map((k) => (
          <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
            <div className="text-sm font-medium text-slate-100">{formatStat(item.stats?.[k])}</div>
          </div>
        ))}
      </div>

      {/* Effect blurb (if any) */}
      {(item.special_effect?.name || item.special_effect?.description) && (
        <div className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-3 text-emerald-200">
          {item.special_effect?.name && (
            <div className="text-xs font-semibold">{item.special_effect.name}</div>
          )}
          {item.special_effect?.description && (
            <p className="mt-1 text-xs text-emerald-300/90">{item.special_effect.description}</p>
          )}
        </div>
      )}
    </div>
  );
}