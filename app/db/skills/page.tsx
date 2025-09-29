"use client";

import { useEffect, useMemo, useState } from "react";

type Skill = {
  "Skill Name": string;
  Category: string; // e.g., "Optional Ship Skill", "Exclusive Optional Ship Skill", "Ship Rebuild Bonus Optional Ship Skill"
  "Original Equip Status": string; // "Equippable as an Original Skill" | "Not equippable as an Original Skill" | ""
  Description: string;
  "Required Character Skill(s)": string; // semicolon/newline separated
  "Vigour Used": string | number; // some rows may be strings in the JSON
  "Active/Passive": string; // "Active", "Passive", etc.
  "Exclusively Equipable Ships": string; // newline separated list
  "Synergy Aide Skill": string;
  "Synergy Effects": string;
  // debug fields (may or may not exist)
  "Block Start Row"?: number;
  "Block End Row"?: number;
};

const columnLabels: Record<
  keyof Skill,
  { label: string; tooltip?: string; align?: "left" | "center" | "right" }
> = {
  "Skill Name": { label: "📝 Skill", align: "left" },
  Category: { label: "🏷️ Category", align: "center" },
  "Original Equip Status": {
    label: "⚓ Original",
    tooltip: "Equippable as an Original Skill?",
    align: "center",
  },
  Description: { label: "📜 Description", align: "left" },
  "Required Character Skill(s)": {
    label: "🎓 Requirements",
    tooltip: "Required Character Skill(s)",
    align: "left",
  },
  "Vigour Used": { label: "💠 Vigour", align: "right" },
  "Active/Passive": { label: "⏱️ Mode", tooltip: "Active or Passive", align: "center" },
  "Exclusively Equipable Ships": {
    label: "🚢 Exclusive Ships",
    tooltip: "Ships that can equip this exclusively",
    align: "left",
  },
  "Synergy Aide Skill": { label: "🤝 Synergy Aide", align: "left" },
  "Synergy Effects": { label: "✨ Synergy Effects", align: "left" },
  "Block Start Row": { label: "↘️ From", align: "right" },
  "Block End Row": { label: "↗️ To", align: "right" },
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Skill>("Skill Name");
  const [sortAsc, setSortAsc] = useState(true);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMode, setFilterMode] = useState(""); // Active/Passive
  const [filterOriginal, setFilterOriginal] = useState(""); // Equippable as Original?
  const [filterShipText, setFilterShipText] = useState(""); // text search within exclusive ships

  useEffect(() => {
    fetch("/data/ship_skills.json")
      .then((r) => r.json())
      .then((data: Skill[]) => setSkills(data));
  }, []);

  // Unique option lists
  const categories = useMemo(
    () =>
      Array.from(new Set(skills.map((s) => s.Category).filter(Boolean))).sort(),
    [skills]
  );
  const modes = useMemo(
    () =>
      Array.from(new Set(skills.map((s) => s["Active/Passive"]).filter(Boolean))).sort(),
    [skills]
  );
  const originalStatuses = useMemo(
    () =>
      Array.from(
        new Set(skills.map((s) => s["Original Equip Status"]).filter(Boolean))
      ).sort(),
    [skills]
  );

  const visibleColumns: (keyof Skill)[] = useMemo(
    () => [
      "Skill Name",
      "Category",
      "Original Equip Status",
      "Vigour Used",
      "Active/Passive",
      "Exclusively Equipable Ships",
      "Synergy Aide Skill",
      "Synergy Effects",
      "Description",
      "Required Character Skill(s)",
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shipQ = filterShipText.trim().toLowerCase();

    const rows = skills
      .filter((s) =>
        q
          ? (s["Skill Name"] || "").toLowerCase().includes(q) ||
            (s.Description || "").toLowerCase().includes(q)
          : true
      )
      .filter((s) => (filterCategory ? s.Category === filterCategory : true))
      .filter((s) => (filterMode ? s["Active/Passive"] === filterMode : true))
      .filter((s) =>
        filterOriginal ? s["Original Equip Status"] === filterOriginal : true
      )
      .filter((s) =>
        shipQ
          ? (s["Exclusively Equipable Ships"] || "")
              .toLowerCase()
              .includes(shipQ)
          : true
      )
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        // parse numbers for vigour & debug rows
        const numericKeys: (keyof Skill)[] = [
          "Vigour Used",
          "Block Start Row",
          "Block End Row",
        ];
        if (numericKeys.includes(sortKey)) {
          const na = Number(String(aVal).match(/\d+/)?.[0] ?? NaN);
          const nb = Number(String(bVal).match(/\d+/)?.[0] ?? NaN);
          if (!isNaN(na) && !isNaN(nb)) {
            return sortAsc ? na - nb : nb - na;
          }
        }

        const sa = String(aVal ?? "");
        const sb = String(bVal ?? "");
        return sortAsc ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });

    return rows;
  }, [skills, query, filterCategory, filterMode, filterOriginal, filterShipText, sortKey, sortAsc]);

  const handleSort = (key: keyof Skill) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <main className="min-h-screen bg-[url('/textures/map-parchment.png')] bg-cover bg-fixed p-6">
      <div className="max-w-7xl mx-auto bg-[#fdf6e3]/95 p-6 rounded-lg shadow-lg">
        {/* Title */}
        <h1 className="text-center text-3xl font-serif text-[#3b2f2f] drop-shadow-md mb-6">
          📜 Ship Skills Database
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <input
            type="text"
            placeholder="🔎 Search skill name or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-4 py-2 rounded-full border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          >
            <option value="">All Modes</option>
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterOriginal}
            onChange={(e) => setFilterOriginal(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          >
            <option value="">Original: Any</option>
            {originalStatuses.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="🚢 Filter by exclusive ship name..."
            value={filterShipText}
            onChange={(e) => setFilterShipText(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#8b7355] bg-[#fff8e7] text-[#3b2f2f]"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm bg-[#fffdf5] shadow">
            <thead className="bg-[#4b2e19] text-[#d4af37]">
              <tr>
                {visibleColumns.map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    title={columnLabels[key]?.tooltip}
                    className="px-3 py-2 border border-[#8b7355] text-center cursor-pointer"
                  >
                    {columnLabels[key]?.label ?? key}{" "}
                    {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    idx % 2 === 0 ? "bg-[#fff8e7]" : "bg-[#f5e6ca]"
                  } hover:bg-[#fde68a]/70`}
                >
                  {visibleColumns.map((key) => (
                    <td
                      key={String(key)}
                      className={`px-3 py-2 border border-[#e0c9a6] ${
                        columnLabels[key]?.align === "right"
                          ? "text-right"
                          : columnLabels[key]?.align === "left"
                          ? "text-left"
                          : "text-center"
                      }`}
                    >
                      {/* Pretty-print multi-line fields */}
                      {typeof row[key] === "string" &&
                      (key === "Exclusively Equipable Ships" ||
                        key === "Required Character Skill(s)")

                        ? (row[key] as string)
                            .split(/\r?\n/)
                            .filter(Boolean)
                            .map((line, i) => (
                              <div key={i} className="whitespace-pre-wrap">
                                {line}
                              </div>
                            ))
                        : String(row[key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-sm text-[#3b2f2f]/70">
          💡 Tip: Click column headers to sort. Use the filters above to narrow
          down skills by category, mode, original equippable status, or ships.
        </p>
      </div>
    </main>
  );
}