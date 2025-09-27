"use client";

import { useEffect, useState } from "react";

// Ship type
type Ship = {
  "Ship Name": string;
  Size: string;
  Type: string;
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
};

// Column labels + tooltips
const columnLabels: Record<
  keyof Ship,
  { label: string; tooltip?: string; align?: "left" | "center" | "right" }
> = {
  "Ship Name": { label: "🚢 Ship", align: "left" },
  Size: { label: "📏 Size", tooltip: "Ship size (Light/Med/Heavy)", align: "center" },
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
  "Cash Ship": { label: "💰", tooltip: "Cash Shop Ship?", align: "center" },
};

export default function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Ship>("Ship Name");
  const [sortAsc, setSortAsc] = useState(true);

  // Filters
  const [filterSize, setFilterSize] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCash, setFilterCash] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");

  useEffect(() => {
    fetch("/data/ships.json")
      .then((res) => res.json())
      .then((data) => setShips(data));
  }, []);

  // Filtering + search
  const filtered = ships
    .filter((ship) =>
      ship["Ship Name"].toLowerCase().includes(query.toLowerCase())
    )
    .filter((ship) => (filterSize ? ship.Size === filterSize : true))
    .filter((ship) => (filterType ? ship.Type === filterType : true))
    .filter((ship) => (filterCash ? ship["Cash Ship"] === filterCash : true))
    .filter((ship) =>
      filterMaterial ? ship["Base Material"].includes(filterMaterial) : true
    )
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const handleSort = (key: keyof Ship) => {
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
            <option value="Med">Medium</option>
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
            <option value="--">Normal Only</option>
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
                {(Object.keys(filtered[0] || {}) as (keyof Ship)[]).map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    title={columnLabels[key].tooltip}
                    className="px-3 py-2 border border-[#8b7355] text-center cursor-pointer"
                  >
                    {columnLabels[key].label}{" "}
                    {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ship, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    idx % 2 === 0 ? "bg-[#fff8e7]" : "bg-[#f5e6ca]"
                  } hover:bg-[#fde68a]/70`}
                >
                  {(Object.keys(ship) as (keyof Ship)[]).map((key, i) => (
                    <td
                      key={i}
                      className={`px-3 py-2 border border-[#e0c9a6] ${
                        columnLabels[key].align === "right"
                          ? "text-right"
                          : columnLabels[key].align === "left"
                          ? "text-left"
                          : "text-center"
                      }`}
                    >
                      {ship[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-sm text-[#3b2f2f]/70">
          💡 Tip: Use filters above or scroll sideways on mobile to explore ship stats.
        </p>
      </div>
    </main>
  );
}