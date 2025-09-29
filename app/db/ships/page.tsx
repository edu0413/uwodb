"use client";

import { useEffect, useMemo, useState, Fragment } from "react";

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
  "Optional Skills"?: string[]; // sometimes missing
  "Optional Skill Details"?: OptionalSkillDetail[]; // sometimes missing
};

// Column labels + tooltips
const columnLabels: Record<
  keyof Ship,
  { label: string; tooltip?: string; align?: "left" | "center" | "right" }
> = {
  "Ship Name": { label: "🚢 Ship", align: "left" },
  Size: { label: "📏 Size", tooltip: "Ship size (Light/Standard/Heavy)", align: "center" },
  Type: { label: "⚔️ Role", tooltip: "Adventure / Trade / Battle", align: "center" },
  "Adv Lvl": { label: "🎓 Adv", tooltip: "Adventure Level Req.", align: "right" },
  "Trd Lvl": { label: "📦 Mer", tooltip: "Trade Level Req.", align: "right" },
  "Btl Lvl": { label: "⚔️ Mar", tooltip: "Battle Level Req.", align: "right" },
  "Base Dura.": { label: "🛡️ Dura", tooltip: "Base Durability", align: "right" },
  "V. Sail": { label: "⬆️ Vert", tooltip: "Vertical Sail Power", align: "right" },
  "H. Sail": { label: "↔️ Hort", tooltip: "Horizontal Sail Power", align: "right" },
  "Row Power": { label: "🚣 Row", tooltip: "Rowing Power", align: "right" },
  "Turn Speed": { label: "🔄 TS", tooltip: "Turn Speed", align: "right" },
  WR: { label: "🌊 WR", tooltip: "Wave Resistance", align: "right" },
  "Arm.": { label: "🛡️ Armor", align: "right" },
  Cabin: { label: "👥 Crew", tooltip: "Current / Max Crew", align: "center" },
  "C.C.": { label: "💣 Guns", tooltip: "Cannon Count", align: "right" },
  Hold: { label: "📦 Hold", tooltip: "Cargo Capacity", align: "right" },
  Mast: { label: "⛵ Masts", align: "center" },
  "Base Material": { label: "⚒️ Panel", tooltip: "Shipbuilding Material", align: "left" },
  "Cash Ship": { label: "💰", tooltip: "UWC Ship?", align: "center" },
  Steam: { label: "🔥 Steam", tooltip: "Steam-powered?", align: "center" },
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

  const colOrder = (Object.keys(filtered[0] || {}) as (keyof Ship)[]);
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

  // Build local icon path from skill name
  const skillIconPath = (skillName?: string) => {
    if (!skillName) return "";
    const file = skillName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".png";
    return `/images/ship_skills/${file}`;
  };

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
                {colOrder.map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    title={columnLabels[key].tooltip}
                    className="px-3 py-2 border border-[#8b7355] text-center cursor-pointer select-none"
                  >
                    {columnLabels[key].label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ship, idx) => {
                const name = ship["Ship Name"];
                const isOpen = expanded.has(name);
                const skillRow = skillsByShip.get(name);

                // Normalize to a single, strongly-typed list
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
                          className={`px-3 py-2 border border-[#e0c9a6] ${
                            columnLabels[key].align === "right"
                              ? "text-right"
                              : columnLabels[key].align === "left"
                              ? "text-left"
                              : "text-center"
                          }`}
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

                                  const iconSrc = skillIconPath(s.name);

                                  return (
                                    <div
                                      key={cardKey}
                                      className="rounded-md border border-[#e0c9a6] bg-[#fffdf5] p-3 shadow-sm"
                                    >
                                      <div className="flex items-start justify-between">
                                        <h4 className="font-medium text-[#3b2f2f] flex items-center gap-2">
                                          {iconSrc && (
                                            <img
                                              src={iconSrc}
                                              alt={`${s.name} icon`}
                                              className="w-5 h-5 object-contain"
                                              onError={(e) => {
                                                // Hide the img if the file doesn't exist
                                                (e.currentTarget as HTMLImageElement).style.display = "none";
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