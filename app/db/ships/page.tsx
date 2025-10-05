"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

// Ship type
type Ship = {
  "Ship Name": string;
  Size: string;
  Type: string | null;
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
  Cabin: string;
  "C.C.": number;
  Hold: number;
  Mast: number;
  "Base Material": string;
  "Cash Ship": string;
  Steam: string;
};

// Optional skill types
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

// Column labels + tooltips (icons kept)
type Align = "left" | "center" | "right";
type ColumnMeta = { label: string; icon: LucideIcon; tooltip?: string; align?: Align };

const columnLabels: Record<keyof Ship, ColumnMeta> = {
  "Ship Name": { label: "Ship", icon: ShipIcon, align: "left" },
  Size: { label: "Type", icon: Ruler, tooltip: "Ship type (Light/Standard/Heavy)", align: "center" },
  Type: { label: "Role", icon: Tag, tooltip: "Adventure / Trade / Battle", align: "center" },
  "Adv Lvl": { label: "Adv", icon: GraduationCap, tooltip: "Adventure Level Req.", align: "right" },
  "Trd Lvl": { label: "Mer", icon: Package, tooltip: "Trade Level Req.", align: "right" },
  "Btl Lvl": { label: "Mar", icon: Sword, tooltip: "Battle Level Req.", align: "right" },
  "Base Dura.": { label: "Dura", icon: Shield, tooltip: "Base Durability", align: "right" },
  "V. Sail": { label: "Vert", icon: ArrowUp, tooltip: "Vertical Sail Power", align: "right" },
  "H. Sail": { label: "Horz", icon: ArrowLeftRight, tooltip: "Horizontal Sail Power", align: "right" },
  "Row Power": { label: "Row", icon: Gauge, tooltip: "Rowing Power", align: "right" },
  "Turn Speed": { label: "TS", icon: RefreshCcw, tooltip: "Turn Speed", align: "right" },
  WR: { label: "WR", icon: Waves, tooltip: "Wave Resistance", align: "right" },
  "Arm.": { label: "Armor", icon: Shield, align: "right" },
  Cabin: { label: "Crew", icon: Users, tooltip: "Current / Max Crew", align: "center" },
  "C.C.": { label: "Guns", icon: Crosshair, tooltip: "Cannon Count", align: "right" },
  Hold: { label: "Hold", icon: Boxes, tooltip: "Cargo Capacity", align: "right" },
  Mast: { label: "Masts", icon: Flag, align: "center" },
  "Base Material": { label: "Panel", icon: Hammer, tooltip: "Shipbuilding Material", align: "left" },
  "Cash Ship": { label: "Cash", icon: DollarSign, tooltip: "UWC Ship?", align: "center" },
  Steam: { label: "Steam", icon: Flame, tooltip: "Steam-powered?", align: "center" },
};

export default function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [skills, setSkills] = useState<ShipOptionalSkills[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Ship>("Ship Name");
  const [sortAsc, setSortAsc] = useState(true);

  // Filters
  const [filterSize, setFilterSize] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCash, setFilterCash] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");

  // Expanded rows (by Ship Name)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/ships.json")
      .then((res) => res.json())
      .then((data) => setShips(data));
    fetch("/data/ship_optional_skills.json")
      .then((res) => res.json())
      .then((data) => setSkills(data));
  }, []);

  // Build a quick lookup for optional skills by ship name
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

  // Filtering + search
  const filtered = ships
    .filter((ship) => ship["Ship Name"].toLowerCase().includes(query.toLowerCase()))
    .filter((ship) => (filterSize ? ship.Size === filterSize : true))
    .filter((ship) => (filterType ? ship.Type === filterType : true))
    .filter((ship) => (filterCash ? ship["Cash Ship"] === filterCash : true))
    .filter((ship) => (filterMaterial ? ship["Base Material"].includes(filterMaterial) : true))
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });

  const handleSort = (key: keyof Ship) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const colOrder = Object.keys(filtered[0] || {}) as (keyof Ship)[];
  const colSpanAll = colOrder.length;

  // ---- helpers to keep TS happy and the UI robust ----
  const normalizeDetails = (arr: unknown): OptionalSkillDetail[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((d): OptionalSkillDetail | null => {
        const name = typeof (d as any)?.name === "string" ? (d as any).name : "";
        if (!name) return null;
        const recipeVal = (d as any)?.recipe;
        const ingredientsVal = (d as any)?.ingredients;

        const recipe =
          typeof recipeVal === "string"
            ? recipeVal
            : Array.isArray(recipeVal)
            ? recipeVal.filter((x) => typeof x === "string").join(", ")
            : undefined;

        const ingredients = Array.isArray(ingredientsVal)
          ? ingredientsVal.filter((x) => typeof x === "string")
          : undefined;

        const starred = Boolean((d as any)?.starred);

        return { name, recipe, ingredients, starred };
      })
      .filter((x): x is OptionalSkillDetail => !!x);
  };

  const safeStringArray = (val: unknown): string[] =>
    Array.isArray(val) ? val.map((x) => String(x)) : [];

  const skillIconBase = (skillName?: string) => {
    if (!skillName) return "";
    const file = skillName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `/images/ship_skills/${file}`;
  };

  // Force centered text everywhere in the table body/headers.
  const alignClass = (_align?: Align) => "text-center";

  return (
    <main className="min-h-screen bg-[url('/textures/map-parchment.png')] bg-cover bg-fixed p-6">
      <div className="max-w-7xl mx-auto bg-[#fdf6e3]/95 p-6 rounded-lg shadow-lg">
        {/* Title */}
        <h1 className="text-center text-3xl font-serif text-[#3b2f2f] drop-shadow-md mb-6">
          ⚓ Ships Database
        </h1>

        {/* Search + Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <input
            type="text"
            placeholder="🔍 Search ships..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-4 py-2 rounded-full border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          />
          <select
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          >
            <option value="">All Sizes</option>
            <option value="Lgt">Light</option>
            <option value="Std">Standard</option>
            <option value="Hvy">Heavy</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          >
            <option value="">All Roles</option>
            <option value="Adv">Adventure</option>
            <option value="Trd">Trade</option>
            <option value="Btl">Battle</option>
          </select>
          <select
            value={filterCash}
            onChange={(e) => setFilterCash(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          >
            <option value="">All Ships</option>
            <option value="Yes">Cash Shop Only</option>
            <option value="No">Normal Only</option>
          </select>
          <input
            type="text"
            placeholder="⚒️ Filter by Material"
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm bg-[#fffdf5] shadow">
            <thead className="bg-[#4b2e19] text-[#d4af37]">
              <tr>
                {colOrder.map((key) => {
                  const meta = columnLabels[key];
                  const Icon = meta.icon;
                  return (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      title={meta.tooltip}
                      className={`px-3 py-1.5 border border-[#8b7355] ${alignClass()} cursor-pointer select-none`}
                    >
                      {/* Icon on its own line, label on next line (compact) */}
                      <div className="flex flex-col items-center leading-tight">
                        <Icon className="w-4 h-4 mb-0.5" aria-hidden />
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[11px] font-medium">{meta.label}</span>
                          {sortKey === key ? (
                            <span className="text-[10px]">{sortAsc ? "▲" : "▼"}</span>
                          ) : null}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ship, idx) => {
                const name = ship["Ship Name"];
                const isOpen = expanded.has(name);
                const skillRow = skillsByShip.get(name);

                const details: OptionalSkillDetail[] = normalizeDetails(
                  skillRow?.["Optional Skill Details"]
                );
                const namesOnly = safeStringArray(skillRow?.["Optional Skills"]);

                const cards: OptionalSkillDetail[] =
                  details.length > 0
                    ? details
                    : namesOnly.map((n): OptionalSkillDetail => ({ name: n }));

                return (
                  <Fragment key={name}>
                    <tr
                      onClick={() => toggleExpanded(name)}
                      className={`transition-colors cursor-pointer ${
                        idx % 2 === 0 ? "bg-[#fff8e7]" : "bg-[#f5e6ca]"
                      } hover:bg-[#fde68a]/70`}
                    >
                      {colOrder.map((key) => (
                        <td
                          key={`${name}-${String(key)}`}
                          className="px-3 py-2 border border-[#e0c9a6] text-center"
                        >
                          {ship[key] as any}
                        </td>
                      ))}
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={colSpanAll} className="p-0">
                          <div className="px-4 py-3 bg-[#fff8e7] border-t border-b border-[#e0c9a6]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[#3b2f2f] font-semibold">
                                🎛️ Optional Skills for <span className="underline">{name}</span>
                              </span>
                              <span className="text-xs text-[#3b2f2f]/60">
                                (click row again to collapse)
                              </span>
                            </div>

                            {cards.length === 0 ? (
                              <p className="text-[#3b2f2f]/80 italic">No optional skills listed.</p>
                            ) : (
                              <div className="grid md:grid-cols-2 gap-3">
                                {cards.map((s, i) => {
                                  const cardKey = s.name ? `${name}-skill-${s.name}` : `${name}-skill-${i}`;
                                  const ingredientsText =
                                    s.ingredients && s.ingredients.length > 0
                                      ? s.ingredients.join(", ")
                                      : s.recipe;

                                  const base = skillIconBase(s.name);
                                  const firstSrc = base ? `${base}.png` : "";

                                  return (
                                    <div
                                      key={cardKey}
                                      className="rounded-md border border-[#e0c9a6] bg-[#fffdf5] p-3 shadow-sm"
                                    >
                                      <div className="flex items-start justify-between">
                                        <h4
                                          className="font-medium text-[#3b2f2f] flex items-center gap-2"
                                          title={s.name || "Skill"}
                                        >
                                          {firstSrc && (
                                            <img
                                              src={firstSrc}
                                              alt={`${s.name} icon`}
                                              title={s.name}
                                              className="w-5 h-5 object-contain"
                                              loading="lazy"
                                              decoding="async"
                                              onError={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                if (img.src.endsWith(".png")) {
                                                  img.src = firstSrc.replace(".png", ".webp");
                                                } else if (img.src.endsWith(".webp")) {
                                                  img.src = firstSrc.replace(".png", ".jpg");
                                                } else {
                                                  img.style.display = "none";
                                                }
                                              }}
                                            />
                                          )}
                                          {s.name || "Skill"}
                                        </h4>
                                        {s.starred ? (
                                          <span title="Starred" className="text-[#d4af37]">★</span>
                                        ) : null}
                                      </div>

                                      {ingredientsText ? (
                                        <p className="mt-1 text-xs text-[#3b2f2f]/80">
                                          <span className="font-semibold">Ingredients:</span>{" "}
                                          {ingredientsText}
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

        <p className="mt-4 text-center text-sm text-[#3b2f2f]/70">
          💡 Tip: Use filters above or scroll sideways on mobile to explore ship stats. Click a row to view its optional skills.
        </p>
      </div>
    </main>
  );
}