"use client";

import { useEffect, useMemo, useState, Fragment } from "react";

type Skill = {
  "Skill Name": string;
  Category: string;
  "Original Equip Status": string;
  Description: string;
  "Required Character Skill(s)": string;
  "Vigour Used": string | number;
  "Active/Passive": string;
  "Exclusively Equipable Ships": string;
  "Synergy Aide Skill": string;
  "Synergy Effects": string;
  "Block Start Row"?: number;
  "Block End Row"?: number;
};

type Align = "left" | "center" | "right";
const columnMeta: Record<
  keyof Skill,
  { label: string; tooltip?: string; align?: Align }
> = {
  "Skill Name": { label: "Skill", align: "left" },
  Category: { label: "Category", align: "center" },
  "Original Equip Status": { label: "Original", tooltip: "Equippable as an Original Skill?", align: "center" },
  Description: { label: "Description", align: "left" },
  "Required Character Skill(s)": { label: "Requirements", align: "left" },
  "Vigour Used": { label: "Vigour", align: "right" },
  "Active/Passive": { label: "Mode", tooltip: "Active or Passive", align: "center" },
  "Exclusively Equipable Ships": { label: "Exclusive Ships", align: "left" },
  "Synergy Aide Skill": { label: "Synergy Aide", align: "left" },
  "Synergy Effects": { label: "Synergy Effects", align: "left" },
  "Block Start Row": { label: "From", align: "right" },
  "Block End Row": { label: "To", align: "right" },
};

const VISIBLE_COLS: (keyof Skill)[] = [
  "Skill Name",
  "Category",
  "Original Equip Status",
  "Vigour Used",
  "Active/Passive",
  "Exclusively Equipable Ships",
  "Synergy Aide Skill",
];

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function parseNumberish(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return NaN;
}

// --- skill icons (put right under parseNumberish) ---
function skillIconBase(skillName?: string) {
  if (!skillName) return "";
  const file = skillName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `/images/ship_skills/${file}`;
}

function SkillIcon({ name, width = 24, height = 28 }: { name?: string; width?: number; height?: number }) {
  const base = skillIconBase(name);
  const [src, setSrc] = useState(base ? `${base}.png` : "");

  useEffect(() => {
    setSrc(base ? `${base}.png` : "");
  }, [base]);

  const onError = () => {
    if (!base) return;
    if (src.endsWith(".png")) setSrc(`${base}.webp`);
    else if (src.endsWith(".webp")) setSrc(`${base}.jpg`);
    else setSrc(""); // give up silently
  };

  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name || "skill"}
      title={name}
      onError={onError}
      className="inline-block align-[-2px]"
      style={{ width, height }}
      loading="lazy"
      decoding="async"
    />
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof Skill>("Skill Name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterOriginal, setFilterOriginal] = useState("");
  const [filterShipText, setFilterShipText] = useState("");

  // Row expansion
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/ship_skills.json")
      .then((r) => r.json())
      .then((data: Skill[]) => setSkills(data))
      .catch(() => setSkills([]));
  }, []);

  // Unique options
  const categories = useMemo(
    () => Array.from(new Set(skills.map((s) => s.Category).filter(Boolean))).sort(),
    [skills]
  );
  const modes = useMemo(
    () => Array.from(new Set(skills.map((s) => s["Active/Passive"]).filter(Boolean))).sort(),
    [skills]
  );
  const originalStatuses = useMemo(
    () => Array.from(new Set(skills.map((s) => s["Original Equip Status"]).filter(Boolean))).sort(),
    [skills]
  );

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    const shipQ = filterShipText.trim().toLowerCase();

    let rows = skills
      .filter((s) =>
        key
          ? [s["Skill Name"], s.Description, s["Synergy Aide Skill"], s["Synergy Effects"]]
              .join(" ")
              .toLowerCase()
              .includes(key)
          : true
      )
      .filter((s) => (filterCategory ? s.Category === filterCategory : true))
      .filter((s) => (filterMode ? s["Active/Passive"] === filterMode : true))
      .filter((s) => (filterOriginal ? s["Original Equip Status"] === filterOriginal : true))
      .filter((s) =>
        shipQ ? (s["Exclusively Equipable Ships"] || "").toLowerCase().includes(shipQ) : true
      );

    const dir = sortDir === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      // Numeric-friendly sort for Vigour and debug fields
      if (["Vigour Used", "Block Start Row", "Block End Row"].includes(sortKey as string)) {
        const na = parseNumberish(a[sortKey]);
        const nb = parseNumberish(b[sortKey]);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
      }
      const sa = String(a[sortKey] ?? "");
      const sb = String(b[sortKey] ?? "");
      return sa.localeCompare(sb) * dir;
    });

    return rows;
  }, [skills, q, filterCategory, filterMode, filterOriginal, filterShipText, sortKey, sortDir]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setQ("");
    setFilterCategory("");
    setFilterMode("");
    setFilterOriginal("");
    setFilterShipText("");
    setSortKey("Skill Name");
    setSortDir("asc");
    setExpanded(new Set());
  };

  const handleSort = (key: keyof Skill) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ship Skills</h1>
            <p className="mt-1 text-slate-400">
              Browse, filter and sort all ship skills. Click a row for full details.
            </p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, description, synergy…"
              className="w-full rounded-2xl bg-slate-900/60 px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Top Filter Toolbar */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400">Filters</span>
            <button onClick={resetFilters} className="ml-auto text-xs text-indigo-400 hover:text-indigo-300">
              Reset
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Modes</option>
              {modes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterOriginal}
              onChange={(e) => setFilterOriginal(e.target.value)}
              className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Original: Any</option>
              {originalStatuses.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <input
              type="text"
              value={filterShipText}
              onChange={(e) => setFilterShipText(e.target.value)}
              placeholder="Filter by ship name…"
              className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />

            {/* Mobile sort select */}
            <div className="lg:hidden">
              <label className="sr-only" htmlFor="mobile-sort">Sort</label>
              <select
                id="mobile-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as keyof Skill)}
                className="w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                {VISIBLE_COLS.map((k) => (
                  <option key={k} value={k}>{columnMeta[k]?.label ?? k}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-slate-400">
          Showing <span className="text-slate-200 font-medium">{filtered.length}</span> of {skills.length} skills
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-900/40">
              <tr>
                {VISIBLE_COLS.map((key) => (
                  <th
                    key={String(key)}
                    onClick={() => handleSort(key)}
                    title={columnMeta[key]?.tooltip}
                    className={cls(
                      "px-3 py-2 border border-slate-800 text-slate-200 cursor-pointer select-none",
                      columnMeta[key]?.align === "left" && "text-left",
                      columnMeta[key]?.align === "right" && "text-right",
                      (!columnMeta[key]?.align || columnMeta[key]?.align === "center") && "text-center",
                    )}
                  >
                    <div className="inline-flex items-center gap-1">
                      <span className="text-[11px] font-medium">{columnMeta[key]?.label ?? key}</span>
                      {sortKey === key ? (
                        <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const id = `${row["Skill Name"]}-${idx}`; // safe unique key
                const open = expanded.has(id);
                const ships = (row["Exclusively Equipable Ships"] || "").split(/\r?\n/).filter(Boolean);
                const shipsInline = ships.slice(0, 2).join(" · ") + (ships.length > 2 ? ` +${ships.length - 2}` : "");
                return (
                  <Fragment key={id}>
                    <tr
                      onClick={() => toggleExpanded(id)}
                      className={cls(
                        "transition-colors cursor-pointer",
                        idx % 2 === 0 ? "bg-slate-900/20" : "bg-slate-900/10",
                        "hover:bg-slate-800/60"
                      )}
                    >
                      {VISIBLE_COLS.map((key) => (
                        <td
                          key={String(key)}
                          className={cls(
                            "px-3 py-2 border border-slate-800",
                            columnMeta[key]?.align === "left" && "text-left",
                            columnMeta[key]?.align === "right" && "text-right",
                            (!columnMeta[key]?.align || columnMeta[key]?.align === "center") && "text-center",
                          )}
                        >
                          {key === "Original Equip Status" ? (
                            <span
                              className={cls(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ring-1",
                                /not/i.test(row[key] || "")
                                  ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                                  : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                              )}
                            >
                              {row[key] || "—"}
                            </span>
                          ) : key === "Vigour Used" ? (
                            parseNumberish(row[key]) || row[key] === 0 ? parseNumberish(row[key]) : "—"
                          ) : key === "Exclusively Equipable Ships" ? (
                            ships.length ? shipsInline : "—"
                          ) : key === "Skill Name" ? (
                            <span className="inline-flex items-center gap-2">
                              <SkillIcon name={row["Skill Name"]} />
                              {row["Skill Name"] || "—"}
                            </span>
                          ) : key === "Synergy Aide Skill" ? (
                            <span className="inline-flex items-center gap-2">
                              <SkillIcon name={row["Synergy Aide Skill"]} />
                              {row["Synergy Aide Skill"] || "—"}
                            </span>
                          ) : (
                            String(row[key] ?? "—")
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Details row */}
                    {open && (
                      <tr>
                        <td colSpan={VISIBLE_COLS.length} className="p-0">
                          <div className="px-4 py-4 bg-slate-900/40 border-t border-b border-slate-800">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                                <div className="text-xs font-semibold text-slate-300">Description</div>
                                <p className="mt-1 text-sm text-slate-200 whitespace-pre-line">
                                  {row.Description || "—"}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                                <div className="text-xs font-semibold text-slate-300">Requirements</div>
                                <div className="mt-1 text-sm text-slate-200 whitespace-pre-line">
                                  {row["Required Character Skill(s)"] || "—"}
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                                <div className="text-xs font-semibold text-slate-300">Synergy</div>
                                <div className="mt-1 text-xs text-slate-400">Aide Skill</div>
                                <div className="text-sm text-slate-200">{row["Synergy Aide Skill"] || "—"}</div>
                                <div className="mt-2 text-xs text-slate-400">Effects</div>
                                <div className="text-sm text-slate-200 whitespace-pre-line">
                                  {row["Synergy Effects"] || "—"}
                                </div>
                              </div>
                            </div>

                            {/* Exclusive ships full list */}
                            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                              <div className="text-xs font-semibold text-slate-300">Exclusive Ships</div>
                              {ships.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {ships.map((s, i) => (
                                    <span
                                      key={`${id}-ship-${i}`}
                                      className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300 ring-1 ring-indigo-500/30"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-1 text-sm text-slate-400">—</div>
                              )}
                            </div>
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

        <p className="mt-4 text-center text-sm text-slate-400">
          Tip: Click column headers to sort. Use the top filters to narrow down skills by category, mode, original
          equippable status, or ships. Click a row to view full details.
        </p>
      </div>
    </div>
  );
}