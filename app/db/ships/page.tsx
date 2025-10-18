"use client";

import React, { useEffect, useMemo, useState, Fragment, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { GitCompare, Plus, X } from "lucide-react";

import {
  Ship as ShipIcon,
  Ruler,
  Tag,
  GraduationCap,
  Package,
  Sword,
  Shield,
  ArrowUp,
  ArrowLeftRight,
  Gauge,
  RefreshCcw,
  Waves,
  Users,
  Crosshair,
  Boxes,
  Flag,
  Hammer,
  DollarSign,
  Flame,
  ListFilter,
  ChevronsUpDown,
  Check,
} from "lucide-react";

// ---------- Types ----------
type Ship = {
  "Ship Name": string;
  Size: string;
  Type: string | null; // Adv | Trd | Btl | null
  "Adv Lvl": number;
  "Trd Lvl": number;
  "Btl Lvl": number;
  "Base Dura.": number;
  "V. Sail": number;
  "H. Sail": number;
  "Row Power": number;
  "Turn Speed": number;
  WR: number;
  "Arm.": number;
  Cabin: string; // e.g. "30/60"
  "C.C.": number;
  Hold: number;
  Mast: number;
  "Base Material": string;
  "Cash Ship": string; // Yes | No | ""
  Steam: string; // Yes | No | ""
};

type OptionalSkillDetail = {
  name: string;
  recipe?: string;
  ingredients?: string[];
  starred?: boolean;
};

type ShipOptionalSkills = {
  "Ship Name": string;
  "Optional Skills"?: string[];
  "Optional Skill Details"?: OptionalSkillDetail[];
};

// ---------- Column Meta ----------
type Align = "left" | "center" | "right";
type ColumnMeta = { label: string; icon: LucideIcon; tooltip?: string; align?: Align };

const columnLabels: Record<keyof Ship, ColumnMeta> = {
  "Ship Name": { label: "Ship", icon: ShipIcon, align: "left" },
  Size: { label: "Type", icon: Ruler, tooltip: "Ship size (Lgt/Std/Hvy)", align: "center" },
  Type: { label: "Role", icon: Tag, tooltip: "Adv / Trd / Btl", align: "center" },
  "Adv Lvl": { label: "Adv", icon: GraduationCap, tooltip: "Adventure Level", align: "right" },
  "Trd Lvl": { label: "Mer", icon: Package, tooltip: "Trade Level", align: "right" },
  "Btl Lvl": { label: "Mar", icon: Sword, tooltip: "Battle Level", align: "right" },
  "Base Dura.": { label: "Dura", icon: Shield, tooltip: "Base Durability", align: "right" },
  "V. Sail": { label: "Vert", icon: ArrowUp, tooltip: "Vertical Sail", align: "right" },
  "H. Sail": { label: "Horz", icon: ArrowLeftRight, tooltip: "Horizontal Sail", align: "right" },
  "Row Power": { label: "Row", icon: Gauge, tooltip: "Rowing Power", align: "right" },
  "Turn Speed": { label: "TS", icon: RefreshCcw, tooltip: "Turn Speed", align: "right" },
  WR: { label: "WR", icon: Waves, tooltip: "Wave Resistance", align: "right" },
  "Arm.": { label: "Armor", icon: Shield, align: "right" },
  Cabin: { label: "Crew", icon: Users, tooltip: "Current / Max", align: "center" },
  "C.C.": { label: "Guns", icon: Crosshair, tooltip: "Cannon Count", align: "right" },
  Hold: { label: "Hold", icon: Boxes, tooltip: "Cargo Capacity", align: "right" },
  Mast: { label: "Masts", icon: Flag, align: "center" },
  "Base Material": { label: "Panel", icon: Hammer, tooltip: "Shipbuilding Material", align: "left" },
  "Cash Ship": { label: "Cash", icon: DollarSign, tooltip: "UWC Ship?", align: "center" },
  Steam: { label: "Steam", icon: Flame, tooltip: "Steam-powered?", align: "center" },
};

// Virtual sort key for menu
type SortKey = keyof Ship | "Total Sails";

// ---------- Helpers ----------
function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function inRange(val: number | null | undefined, min: number | "", max: number | "") {
  if (val == null || Number.isNaN(val as any)) return false;
  if (min !== "" && val < Number(min)) return false;
  if (max !== "" && val > Number(max)) return false;
  return true;
}

function parseCrewRange(s: string | undefined) {
  if (!s) return { current: null, max: null };
  const m = s.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { current: Number(m[1]), max: Number(m[2]) } : { current: null, max: null };
}

const DATA_SHIPS = "/data/ships.json";
const DATA_SKILLS = "/data/ship_optional_skills.json";

const totalSails = (s: Ship) => (s["V. Sail"] || 0) + (s["H. Sail"] || 0);

// ---------- Page ----------
export default function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [skills, setSkills] = useState<ShipOptionalSkills[]>([]);

  // Search & sort
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("Ship Name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filters (now in a top toolbar)
  const [sizeFilters, setSizeFilters] = useState<Set<string>>(new Set());
  const [roleFilters, setRoleFilters] = useState<Set<string>>(new Set());
  const [cashFilter, setCashFilter] = useState<"any" | "Yes" | "No">("any");
  const [steamFilter, setSteamFilter] = useState<"any" | "Yes" | "No">("any");
  const [materialQuery, setMaterialQuery] = useState("");
  // numeric ranges
  const [minDura, setMinDura] = useState<number | "">("");
  const [maxDura, setMaxDura] = useState<number | "">("");
  const [minVS, setMinVS] = useState<number | "">("");
  const [maxVS, setMaxVS] = useState<number | "">("");
  const [minHS, setMinHS] = useState<number | "">("");
  const [maxHS, setMaxHS] = useState<number | "">("");
  const [minTS, setMinTS] = useState<number | "">("");
  const [maxTS, setMaxTS] = useState<number | "">("");
  const [minWR, setMinWR] = useState<number | "">("");
  const [maxWR, setMaxWR] = useState<number | "">("");
  const [minTotal, setMinTotal] = useState<number | "">("");
  const [maxTotal, setMaxTotal] = useState<number | "">("");

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Compare selection (max 3)
  const [compare, setCompare] = useState<Ship[]>([]);

  const isCompared = (name: string) =>
    compare.some(s => s["Ship Name"] === name);

  const canAddMore = compare.length < 3;

  const toggleCompareShip = (ship: Ship) => {
    setCompare(prev => {
      const exists = prev.some(s => s["Ship Name"] === ship["Ship Name"]);
      if (exists) return prev.filter(s => s["Ship Name"] !== ship["Ship Name"]);
      if (prev.length >= 3) return prev; // hard cap at 3
      return [...prev, ship];
    });
  };

  const clearCompare = () => setCompare([]);

  useEffect(() => {
    let cancelled = false;
    fetch(DATA_SHIPS).then((r) => r.json()).then((d: Ship[]) => { if (!cancelled) setShips(d); });
    fetch(DATA_SKILLS).then((r) => r.json()).then((d: ShipOptionalSkills[]) => { if (!cancelled) setSkills(d); });
    return () => { cancelled = true; };
  }, []);

  const skillsByShip = useMemo(() => {
    const map = new Map<string, ShipOptionalSkills>();
    for (const row of skills || []) {
      const name = row?.["Ship Name"];
      if (!name || typeof name !== "string") continue;
      if (name.toLowerCase().startsWith("updated on")) continue;
      map.set(name, row);
    }
    return map;
  }, [skills]);

  // Unique filter values
  const uniqueSizes = useMemo(() => Array.from(new Set(ships.map(s => s.Size).filter(Boolean))).sort(), [ships]);
  const uniqueRoles = useMemo(() => Array.from(new Set(ships.map(s => s.Type || "").filter(Boolean))).sort(), [ships]);
  const uniqueMaterials = useMemo(() => Array.from(new Set(ships.map(s => s["Base Material"]).filter(Boolean))).sort(), [ships]);

  const colOrder = useMemo(() => Object.keys(columnLabels) as (keyof Ship)[], []);
  const colSpanAll = colOrder.length;

  const visible = useMemo(() => {
    const key = q.trim().toLowerCase();
    let arr = ships.filter((s) => {
      // text match across name, material
      const hay = `${s["Ship Name"]} ${s["Base Material"]} ${s.Type || ""}`.toLowerCase();
      if (key && !hay.includes(key)) return false;

      // size chip filters
      if (sizeFilters.size > 0 && !sizeFilters.has(s.Size)) return false;

      // role chip filters
      const role = s.Type || "";
      if (roleFilters.size > 0 && !roleFilters.has(role)) return false;

      // cash / steam toggles
      if (cashFilter !== "any" && s["Cash Ship"] !== cashFilter) return false;
      if (steamFilter !== "any" && s.Steam !== steamFilter) return false;

      // material query contains
      if (materialQuery && !s["Base Material"].toLowerCase().includes(materialQuery.toLowerCase())) return false;

      // numeric ranges
      if (!inRange(s["Base Dura."], minDura, maxDura)) return false;
      if (!inRange(s["V. Sail"], minVS, maxVS)) return false;
      if (!inRange(s["H. Sail"], minHS, maxHS)) return false;
      if (!inRange(s["Turn Speed"], minTS, maxTS)) return false;
      if (!inRange(s.WR, minWR, maxWR)) return false;

      const tot = totalSails(s);
      if (!inRange(tot, minTotal, maxTotal)) return false;

      return true;
    });

    // sorting
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "Total Sails") {
        return (totalSails(a) - totalSails(b)) * dir;
      }
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });

    return arr;
  }, [ships, q, sizeFilters, roleFilters, cashFilter, steamFilter, materialQuery, minDura, maxDura, minVS, maxVS, minHS, maxHS, minTS, maxTS, minWR, maxWR, minTotal, maxTotal, sortKey, sortDir]);

  const resetFilters = () => {
    setQ("");
    setSizeFilters(new Set());
    setRoleFilters(new Set());
    setCashFilter("any");
    setSteamFilter("any");
    setMaterialQuery("");
    setMinDura(""); setMaxDura("");
    setMinVS(""); setMaxVS("");
    setMinHS(""); setMaxHS("");
    setMinTS(""); setMaxTS("");
    setMinWR(""); setMaxWR("");
    setMinTotal(""); setMaxTotal("");
    setSortKey("Ship Name"); setSortDir("asc");
  };

  const toggleChip = (set: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    set(prev => { const next = new Set(prev); next.has(val) ? next.delete(val) : next.add(val); return next; });
  };

  const handleHeaderSort = (key: keyof Ship) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ships Database</h1>
            <p className="mt-1 text-slate-400">Search, filter by stats (incl. Total Sails), and sort. Click a row to view optional skills.</p>
          </div>
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ships, materials, role…"
              className="w-full rounded-2xl bg-slate-900/60 px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Top Filter Toolbar */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-slate-400"><ListFilter className="h-4 w-4"/> Filters</span>
            <button onClick={resetFilters} className="cursor-pointer ml-auto text-xs text-indigo-400 hover:text-indigo-300">Reset</button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Size chips */}
            <div>
              <div className="text-[11px] text-slate-400">Size</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {uniqueSizes.map((s) => (
                  <button key={s} onClick={toggleChip(setSizeFilters, s)} className={cls(
                    "px-3 py-1.5 rounded-full text-xs border transition",
                    sizeFilters.has(s) ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                  )}>{s}</button>
                ))}
              </div>
            </div>

            {/* Role chips */}
            <div>
              <div className="text-[11px] text-slate-400">Role</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {uniqueRoles.map((r) => (
                  <button key={r} onClick={toggleChip(setRoleFilters, r)} className={cls(
                    "px-3 py-1.5 rounded-full text-xs border transition",
                    roleFilters.has(r) ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                  )}>{r}</button>
                ))}
              </div>
            </div>

            {/* Cash / Steam selects */}
            <div>
              <label className="text-[11px] text-slate-400">Cash Shop</label>
              <select value={cashFilter} onChange={(e) => setCashFilter(e.target.value as any)} className="mt-1 w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500">
                <option value="any">Any</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Steam</label>
              <select value={steamFilter} onChange={(e) => setSteamFilter(e.target.value as any)} className="mt-1 w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500">
                <option value="any">Any</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          {/* Stat ranges incl. Total Sails */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <RangeInput label="Durability" min={minDura} max={maxDura} setMin={setMinDura} setMax={setMaxDura} />
            <RangeInput label="V. Sail" min={minVS} max={maxVS} setMin={setMinVS} setMax={setMaxVS} />
            <RangeInput label="H. Sail" min={minHS} max={maxHS} setMin={setMinHS} setMax={setMaxHS} />
            <RangeInput label="Total Sails" min={minTotal} max={maxTotal} setMin={setMinTotal} setMax={setMaxTotal} />
            <RangeInput label="Turn Speed" min={minTS} max={maxTS} setMin={setMinTS} setMax={setMaxTS} />
            <RangeInput label="Wave Resist" min={minWR} max={maxWR} setMin={setMinWR} setMax={setMaxWR} />
          </div>

          {/* Sort controls with icon menu */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <IconSortSelect sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
          </div>

          {/* CTA: Compare hint (bottom-right) */}
          <div className="mt-6">
            {/* wide inner container that still sits at the end */}
            <div className="ml-auto w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col items-center sm:flex-row sm:items-end gap-4">
              <div className="flex-1 text-center sm:text-right">
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
                  Compare ships
                </div>
                <div className="text-[11px] text-slate-400">
                  by clicking the button on a ship row
                </div>
              </div>

              <button
                type="button"
                aria-disabled="true"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30 shadow hover:bg-emerald-500/15 animate-pulse cursor-default"
                title="Add to compare (example)"
              >
                <GitCompare className="h-4 w-4" />
                Add to compare
              </button>
            </div>
          </div>
        </div>

        {/* Compare card */}
        {compare.length > 0 && (
          <div className="mt-4 rounded-2xl border border-indigo-800/40 bg-indigo-950/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Compare Ships ({compare.length}/3)
              </h3>
              <button
                onClick={clearCompare}
                className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200"
              >
                Clear
              </button>
            </div>

            <div className="mt-1 text-[11px] text-slate-400">
              Green chips indicate the best value for that stat (ties are highlighted too).
            </div>

            {/* ---- build rows + wins ---- */}
            {(() => {
              const statRows = [
                { label: "Size", kind: "text", get: (s: Ship) => s.Size },
                { label: "Role", kind: "text", get: (s: Ship) => s.Type ?? "—" },
                { label: "V. Sail", kind: "number", get: (s: Ship) => s["V. Sail"] },
                { label: "H. Sail", kind: "number", get: (s: Ship) => s["H. Sail"] },
                { label: "Total Sails", kind: "number", get: (s: Ship) => totalSails(s) },
                { label: "Row Power", kind: "number", get: (s: Ship) => s["Row Power"] },
                { label: "Turn Speed", kind: "number", get: (s: Ship) => s["Turn Speed"] },
                { label: "Wave Resist", kind: "number", get: (s: Ship) => s.WR },
                { label: "Armor", kind: "number", get: (s: Ship) => s["Arm."] },
                { label: "Guns", kind: "number", get: (s: Ship) => s["C.C."] },
                { label: "Hold", kind: "number", get: (s: Ship) => s.Hold },
                { label: "Durability", kind: "number", get: (s: Ship) => s["Base Dura."] },
                { label: "Crew (Max)", kind: "number", get: (s: Ship) => parseCrewRange(s.Cabin).max ?? NaN },
                { label: "Masts", kind: "number", get: (s: Ship) => s.Mast },
                { label: "Material", kind: "text", get: (s: Ship) => s["Base Material"] },
              ] as const;

              // count "wins" per ship (ties count for all winners)
              const wins = Array(compare.length).fill(0) as number[];
              statRows.forEach((row) => {
                if (row.kind !== "number") return;
                const vals = compare.map((s) => row.get(s));
                const nums = vals.map((v) =>
                  typeof v === "number" && Number.isFinite(v) ? v : -Infinity
                );
                const best = Math.max(...nums);
                if (best === -Infinity) return;
                nums.forEach((v, i) => {
                  if (v === best) wins[i] += 1;
                });
              });

              // rank by wins (ties share rank)
              const uniqueScores = Array.from(new Set([...wins].sort((a, b) => b - a)));
              const scoreToRank = new Map<number, number>();
              uniqueScores.forEach((score, idx) => scoreToRank.set(score, idx + 1));
              const ranks = wins.map((w) => scoreToRank.get(w) || 3);

              const rankClass = (rank: number) =>
                rank === 1
                  ? "text-amber-300 font-semibold"
                  : rank === 2
                  ? "text-slate-300 font-medium"
                  : "text-slate-200";

              return (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[18rem]" />
                      {/* equal width for ship columns */}
                      {compare.map((_, i) => (
                        <col key={i} />
                      ))}
                    </colgroup>

                    <thead className="bg-slate-900/60">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-300">Stat</th>
                        {compare.map((s, i) => (
                          <th key={s["Ship Name"]} className="px-3 py-2">
                            <div
                              className={`mx-auto truncate max-w-[22ch] text-center ${rankClass(
                                ranks[i]
                              )}`}
                              title={s["Ship Name"]}
                            >
                              {s["Ship Name"]}
                            </div>
                            <div className="mt-0.5 text-center text-[11px] text-slate-400">
                              Best stats: <span className="text-slate-300">{wins[i]}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="border-t border-slate-800">
                      {statRows.map((row, ridx) => {
                        const values = compare.map((s) => row.get(s));
                        const isNumber = row.kind === "number";
                        const nums = isNumber
                          ? values.map((v) =>
                              typeof v === "number" && Number.isFinite(v) ? v : -Infinity
                            )
                          : [];
                        const best = isNumber ? Math.max(...(nums as number[])) : undefined;

                        return (
                          <tr
                            key={row.label}
                            className={ridx % 2 === 0 ? "bg-slate-900/20" : "bg-slate-900/10"}
                          >
                            <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                              {row.label}
                            </td>

                            {compare.map((s, cidx) => {
                              const v = values[cidx];
                              const num = typeof v === "number" && Number.isFinite(v) ? (v as number) : null;
                              const isBest = isNumber && num != null && num === best;

                              return (
                                <td key={`${row.label}-${s["Ship Name"]}`} className="px-3 py-2 text-center">
                                  {row.kind === "text" ? (
                                    <span className="text-slate-200">{String(v ?? "—")}</span>
                                  ) : num != null ? (
                                    <span
                                      className={
                                        isBest
                                          ? "inline-flex items-center rounded-md px-2 py-0.5 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 font-semibold"
                                          : "text-slate-200"
                                      }
                                      title={isBest ? "Best" : undefined}
                                    >
                                      {num.toLocaleString("en-US")}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* Results: Table */}
        <div className="mt-4 text-sm text-slate-400">
          Showing <span className="text-slate-200 font-medium">{visible.length}</span> of {ships.length} ships
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-900/40">
              <tr>
                {/* NEW compare header cell (non-sortable) */}
                <th
                  className="w-36 px-3 py-2 border border-slate-800 text-slate-300 text-center"
                  title="Quickly add/remove a ship to the compare panel"
                >
                  Compare
                </th>

                {colOrder.map((key) => {
                  const meta = columnLabels[key];
                  const Icon = meta.icon;
                  return (
                    <th
                      key={String(key)}
                      onClick={() => handleHeaderSort(key)}
                      title={meta.tooltip}
                      className={cls(
                        "px-3 py-2 border border-slate-800 text-slate-200 cursor-pointer select-none",
                        meta.align === "left" && "text-left",
                        meta.align === "right" && "text-right",
                        (!meta.align || meta.align === "center") && "text-center"
                      )}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <Icon className="w-4 h-4 mb-0.5" aria-hidden />
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[11px] font-medium">{meta.label}</span>
                          {sortKey === key ? (
                            <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                          ) : null}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visible.map((ship, idx) => {
                const name = ship["Ship Name"];
                const isOpen = expanded.has(name);
                const skillRow = skillsByShip.get(name);

                const details = normalizeDetails(skillRow?.["Optional Skill Details"]);
                const namesOnly = safeStringArray(skillRow?.["Optional Skills"]);
                const cards: OptionalSkillDetail[] = details.length > 0 ? details : namesOnly.map((n) => ({ name: n }));

                return (
                  <Fragment key={name}>
                    <tr
                      onClick={() => toggleExpanded(expanded, setExpanded, name)}
                      className={cls(
                        "transition-colors cursor-pointer",
                        idx % 2 === 0 ? "bg-slate-900/20" : "bg-slate-900/10",
                        "hover:bg-slate-800/60"
                      )}
                    >
                      {/* NEW compare cell before all other columns */}
                      <td className="px-3 py-2 border border-slate-800 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompareShip(ship);
                          }}
                          disabled={!isCompared(name) && !canAddMore}
                          title={
                            !isCompared(name) && !canAddMore
                              ? "You can compare up to 3 ships"
                              : isCompared(name)
                              ? "Remove from compare"
                              : "Add to compare"
                          }
                          className={cls(
                            "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition ring-1 ring-inset",
                            isCompared(name)
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-200 ring-rose-500/30 hover:bg-rose-500/20"
                              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/15 disabled:opacity-50"
                          )}
                        >
                          <GitCompare className="h-4 w-4" />
                          {isCompared(name) ? "Remove" : "Compare"}
                        </button>

                      </td>

                      {colOrder.map((key) => (
                        <td
                          key={`${name}-${String(key)}`}
                          className={cls(
                            "px-3 py-2 border border-slate-800",
                            columnLabels[key].align === "left" && "text-left",
                            columnLabels[key].align === "right" && "text-right",
                            (!columnLabels[key].align || columnLabels[key].align === "center") && "text-center"
                          )}
                        >
                          {ship[key] as any}
                        </td>
                      ))}
                    </tr>

                    {isOpen && (
                      <tr>
                        {/* NOTE: +1 because we added the Compare column */}
                        <td colSpan={colSpanAll + 1} className="p-0">
                          <div className="px-4 py-3 bg-slate-900/40 border-t border-b border-slate-800">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-100 font-semibold">
                                  Optional Skills for <span className="underline">{name}</span>
                                </span>
                                <span className="text-xs text-slate-400">(click row again to collapse)</span>
                              </div>

                            </div>

                            {cards.length === 0 ? (
                              <p className="text-slate-300/80 italic">No optional skills listed.</p>
                            ) : (
                              <div className="grid md:grid-cols-2 gap-3">
                                {cards.map((s, i) => {
                                  const cardKey = s.name ? `${name}-skill-${s.name}` : `${name}-skill-${i}`;
                                  const ingredientsText =
                                    s.ingredients && s.ingredients.length > 0 ? s.ingredients.join(", ") : s.recipe;
                                  const base = skillIconBase(s.name);
                                  const firstSrc = base ? `${base}.png` : "";

                                  return (
                                    <div
                                      key={cardKey}
                                      className="rounded-md border border-slate-800 bg-slate-950/60 p-3 shadow-sm"
                                    >
                                      <div className="flex items-start justify-between">
                                        <h4
                                          className="font-medium text-slate-100 flex items-center gap-2"
                                          title={s.name || "Skill"}
                                        >
                                          {firstSrc && (
                                            <img
                                              src={firstSrc}
                                              alt={`${s.name} icon`}
                                              title={s.name}
                                              style={{ width: "24px", height: "28px" }}
                                              className="object-contain"
                                              loading="lazy"
                                              decoding="async"
                                              onError={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                if (img.src.endsWith(".png")) img.src = firstSrc.replace(".png", ".webp");
                                                else if (img.src.endsWith(".webp")) img.src = firstSrc.replace(".webp", ".jpg");
                                                else img.style.display = "none";
                                              }}
                                            />
                                          )}
                                          {s.name || "Skill"}
                                        </h4>
                                        {s.starred ? <span title="Starred" className="text-amber-300">★</span> : null}
                                      </div>
                                      {ingredientsText ? (
                                        <p className="mt-1 text-xs text-slate-300/90">
                                          <span className="font-semibold">Ingredients:</span> {ingredientsText}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {visible.length === 0 && (
          <div className="mt-8 text-center text-slate-400">No ships match your filters.</div>
        )}
      </div>
    </div>
  );
}

// ---------- Small UI bits ----------
function RangeInput({ label, min, max, setMin, setMax }: { label: string; min: number | ""; max: number | ""; setMin: (n: number | "") => void; setMax: (n: number | "") => void; }) {
  return (
    <div>
      <label className="text-[11px] text-slate-400">{label}</label>
      <div className="mt-1 flex gap-2">
        <input type="number" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value === "" ? "" : Number(e.target.value))}
               className="w-1/2 rounded-xl bg-slate-900/60 px-2 py-1.5 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500" />
        <input type="number" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value === "" ? "" : Number(e.target.value))}
               className="w-1/2 rounded-xl bg-slate-900/60 px-2 py-1.5 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500" />
      </div>
    </div>
  );
}

function toggleExpanded(expanded: Set<string>, setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>, name: string) {
  setExpanded(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });
}

function normalizeDetails(arr: unknown): OptionalSkillDetail[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((d): OptionalSkillDetail | null => {
      const nm = typeof (d as any)?.name === "string" ? (d as any).name : "";
      if (!nm) return null;
      const recipeVal = (d as any)?.recipe;
      const ingredientsVal = (d as any)?.ingredients;
      const recipe = typeof recipeVal === "string" ? recipeVal : Array.isArray(recipeVal) ? recipeVal.filter((x) => typeof x === "string").join(", ") : undefined;
      const ingredients = Array.isArray(ingredientsVal) ? ingredientsVal.filter((x) => typeof x === "string") : undefined;
      const starred = Boolean((d as any)?.starred);
      return { name: nm, recipe, ingredients, starred };
    })
    .filter((x): x is OptionalSkillDetail => !!x);
}

function safeStringArray(val: unknown): string[] { return Array.isArray(val) ? val.map((x) => String(x)) : []; }

function skillIconBase(skillName?: string) {
  if (!skillName) return "";
  const file = skillName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `/images/ship_skills/${file}`;
}

// ---------- Icon sort select (custom dropdown with icons) ----------
function IconSortSelect({ sortKey, sortDir, setSortKey, setSortDir }: { sortKey: SortKey; sortDir: "asc" | "desc"; setSortKey: (k: SortKey) => void; setSortDir: (d: "asc" | "desc") => void; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const options: Array<{ key: SortKey; label: string; icon: React.ReactNode; tooltip?: string }> = [
    ...((Object.keys(columnLabels) as (keyof Ship)[]).map(k => ({
      key: k as SortKey,
      label: columnLabels[k].label,
      icon: React.createElement(columnLabels[k].icon, { className: "h-4 w-4" }),
      tooltip: columnLabels[k].tooltip,
    }))),
    { key: "Total Sails", label: "Total Sails", icon: (<span className="inline-flex items-center gap-0.5"><ArrowUp className="h-4 w-4"/><ArrowLeftRight className="h-4 w-4"/></span>) },
  ];

  const current = options.find(o => o.key === sortKey) || options[0];

  return (
    <div className="flex items-center gap-3" ref={ref}>
      <div className="flex-1">
        <div className="text-[11px] text-slate-400">Sort by</div>
        <button onClick={() => setOpen(o => !o)} className="mt-1 w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 hover:ring-slate-600 flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            {current.icon}
            <span>{current.label}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4" />
        </button>
        {open && (
          <div className="z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-lg absolute">
            {options.map(o => (
              <button key={String(o.key)} title={o.tooltip} onClick={() => { setSortKey(o.key); setOpen(false); }}
                className={cls("w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-sm hover:bg-slate-800/70", sortKey === o.key && "bg-slate-800/60")}
              >
                <span className="w-4 h-4 inline-flex items-center justify-center">{o.icon}</span>
                <span className="flex-1">{o.label}</span>
                {sortKey === o.key && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] text-slate-400">Direction</div>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} className="mt-1 rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>
  );
}