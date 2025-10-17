"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

/* ========= Types ========= */
type Skill = {
  name: string;
  price: string;              // can be "" or a number-ish string
  role: "adv" | "trd" | "btl" | "lang" | string;
  acquisition: string;
  description: string;
  refined_effect: string;
};

/* ========= Constants ========= */
const DATA_URL = "/data/skills.json";
const IMAGE_BASE = "/images/skills";
const IMAGE_EXTS = [".png", ".webp", ".jpg", ".jpeg"];
const PLACEHOLDER = "/images/placeholder_skill.png"; // optional if you have it

const ROLE_LABEL: Record<string, string> = {
  adv: "Adventure",
  trd: "Trade",
  btl: "Battle",
  lang: "Language",
};

/* ========= Helpers ========= */
function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parsePriceToNumber(price: string | null | undefined): number | null {
  if (!price) return null;
  const m = String(price).match(/-?\d[\d,]*/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function roleColors(role: string) {
  switch (role) {
    case "btl":
      return "bg-rose-500/10 text-rose-300 ring-rose-500/30";
    case "trd":
      return "bg-amber-500/10 text-amber-300 ring-amber-500/30";
    case "adv":
      return "bg-sky-500/10 text-sky-300 ring-sky-500/30";
    case "lang":
      return "bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/30";
    default:
      return "bg-slate-700/30 text-slate-300 ring-slate-600/40";
  }
}

/* Local image attempt — only local files; no CDN fallback */
function useSkillIcon(name: string) {
  // Sanitize name into multiple possible filename variants
  const candidates = useMemo(() => {
    const raw = name.trim();
    const lower = raw.toLowerCase();

    // Safe slug: replace everything not a-z0-9 with hyphens
    const hyphen = lower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Underscore version
    const underscore = lower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    // Remove all special chars (just compact name)
    const compact = lower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    // Add a version replacing "/" with "-"
    const noSlash = lower.replace(/[\\/]+/g, "-");

    return [raw, lower, hyphen, underscore, compact, noSlash];
  }, [name]);

  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState(
    `${IMAGE_BASE}/${encodeURIComponent(candidates[0])}${IMAGE_EXTS[0]}`
  );

  useEffect(() => {
    setIndex(0);
    setSrc(`${IMAGE_BASE}/${encodeURIComponent(candidates[0])}${IMAGE_EXTS[0]}`);
  }, [candidates]);

  const onError = () => {
    const next = index + 1;
    const variantIdx = Math.floor(next / IMAGE_EXTS.length);
    const extIdx = next % IMAGE_EXTS.length;

    if (variantIdx < candidates.length) {
      setIndex(next);
      setSrc(
        `${IMAGE_BASE}/${encodeURIComponent(candidates[variantIdx])}${IMAGE_EXTS[extIdx]}`
      );
    } else {
      setSrc(PLACEHOLDER);
    }
  };

  return { src, onError };
}

/* ========= Page ========= */
export default function SkillsPage() {
  const [all, setAll] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // search & filters
  const [q, setQ] = useState("");
  const [roleFilters, setRoleFilters] = useState<Set<string>>(new Set()); // adv/trd/btl/lang
  const [hasRefined, setHasRefined] = useState(false);

  // sorting
  const [sortKey, setSortKey] = useState<"name" | "role" | "hasRefined">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(DATA_URL, { cache: "no-store" });
        if (!r.ok) throw new Error(`Failed to load ${DATA_URL}`);
        const json = (await r.json()) as Skill[];
        if (!cancelled) setAll(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load skills.json");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const uniqueRoles = useMemo(
    () =>
      Array.from(new Set(all.map((s) => s.role).filter(Boolean))).sort(
        (a, b) => (ROLE_LABEL[a] || a).localeCompare(ROLE_LABEL[b] || b)
      ),
    [all]
  );

  const visible = useMemo(() => {
    const key = q.trim().toLowerCase();

    const filtered = all.filter((s) => {
      // text search across name, description, acquisition, refined_effect
      const hay = `${s.name} ${s.description} ${s.acquisition} ${s.refined_effect}`.toLowerCase();
      if (key && !hay.includes(key)) return false;

      // role chips
      if (roleFilters.size > 0 && !roleFilters.has(s.role)) return false;

      // refined effect toggle
      if (hasRefined) {
        const has = Boolean(s.refined_effect && s.refined_effect.trim());
        if (!has) return false;
      }

      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "role":
          return (ROLE_LABEL[a.role] || a.role).localeCompare(ROLE_LABEL[b.role] || b.role) * dir;
        case "hasRefined": {
          const ra = a.refined_effect?.trim() ? 1 : 0;
          const rb = b.refined_effect?.trim() ? 1 : 0;
          return (ra - rb) * dir;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [all, q, roleFilters, hasRefined, sortKey, sortDir]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (q.trim()) c++;
    if (roleFilters.size > 0) c++;
    if (hasRefined) c++;
    return c;
  }, [q, roleFilters, hasRefined]);

  const toggleRole = (r: string) =>
    setRoleFilters((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });

  const reset = () => {
    setQ("");
    setRoleFilters(new Set());
    setHasRefined(false);
    setSortKey("name");
    setSortDir("asc");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
            <p className="mt-1 text-slate-400">
              General character skills by role. Search, filter and sort.
            </p>
          </div>
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, description, acquisition…"
              className="w-full rounded-2xl bg-slate-900/60 px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Controls layout */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Filters (left) */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button onClick={reset} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Roles */}
              <div className="mt-4">
                <div className="text-[11px] text-slate-400">Role</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {uniqueRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleRole(r)}
                      className={cls(
                        "px-3 py-1.5 rounded-full text-xs border transition ring-1 ring-inset",
                        roleFilters.has(r)
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                          : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                      )}
                    >
                      {ROLE_LABEL[r] || r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Has refined effect */}
              <div className="mt-5 flex items-center justify-between">
                <label className="text-xs text-slate-400">Has Refined Effect</label>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-500"
                  checked={hasRefined}
                  onChange={(e) => setHasRefined(e.target.checked)}
                />
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
                    <option value="name">Name</option>
                    <option value="role">Role</option>
                    <option value="price">Price</option>
                    <option value="hasRefined">Has Refined</option>
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

          {/* Results (right) */}
          <div className="lg:col-span-9">
            {/* Summary */}
            <div className="mb-3 text-sm text-slate-400">
              {loading
                ? "Loading…"
                : err
                ? <span className="text-rose-400">{err}</span>
                : <>Showing <span className="text-slate-200 font-medium">{visible.length}</span> of {all.length}{activeFiltersCount > 0 && " (filters active)"}.</>}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((s) => (
                <SkillCard key={s.name} skill={s} />
              ))}
            </div>

            {!loading && !err && visible.length === 0 && (
              <div className="mt-16 text-center text-slate-400">
                <p className="text-lg">No skills match your filters.</p>
                <button
                  onClick={reset}
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

/* ========= Card ========= */
function SkillCard({ skill }: { skill: Skill }) {
  const { src, onError } = useSkillIcon(skill.name);
  const priceNum = parsePriceToNumber(skill.price);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm hover:shadow-md hover:border-slate-700"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
        src={src}
        onError={onError}
        alt={skill.name}
        width={24}
        height={28}
        className="object-contain"
        loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-100">{skill.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={cls(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
              roleColors(skill.role)
            )}>
              {ROLE_LABEL[skill.role] || skill.role}
            </span>

            {priceNum != null && (
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300 ring-1 ring-indigo-500/30">
                {priceNum.toLocaleString("en-US")} Ð
              </span>
            )}

            {skill.refined_effect?.trim() && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
                Refined
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        <p className="line-clamp-3 text-sm text-slate-300/90">{skill.description || "—"}</p>

        {skill.acquisition?.trim() && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Acquisition</div>
            <div className="text-sm text-slate-200 whitespace-pre-line">{skill.acquisition}</div>
          </div>
        )}

        {skill.refined_effect?.trim() && (
          <div className="mt-3 rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-3 text-emerald-200">
            <div className="text-xs font-semibold">Refined Effect</div>
            <p className="mt-1 text-xs text-emerald-300/90 whitespace-pre-line">{skill.refined_effect}</p>
          </div>
        )}
      </div>
    </motion.article>
  );
}