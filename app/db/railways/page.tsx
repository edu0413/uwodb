"use client";

import { useEffect, useMemo, useState } from "react";

/** ---------- Types ---------- */
type Secondary = { description: string; values: (string | null)[] };
type Company = {
  name: string;
  thresholds: string[];
  main_effect: { description?: string | null; values: (string | null)[] };
  secondary_effects: Secondary[];
};
type FareRow = {
  discount: string | null;
  ["West Central"]?: string | null;
  ["Southern Florida"]?: string | null;
  ["North River"]?: string | null;
  ["Lakeshore"]?: string | null;
  ["Central River"]?: string | null;
  ["West Coast"]?: string | null;
  ["East Coast"]?: string | null;
};
type DataShape = { companies: Company[]; fare_table: FareRow[] };

/** ---------- Helpers ---------- */
const regions = [
  "West Central",
  "Southern Florida",
  "North River",
  "Lakeshore",
  "Central River",
  "West Coast",
  "East Coast",
] as const;

function parsePercentFromLabel(label: string | null): number {
  if (!label) return 0;
  const m = label.match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : 0;
}

function parseMoneyToNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(s.replace(/[, ]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function normThreshold(th: string) {
  return th.replace(/\s+/g, "").toUpperCase();
}

function cleanEffectLabel(s?: string | null, fallback = "—") {
  if (!s) return fallback;
  return s
    .replace(/^Main\s*Effect\s*:?\s*/i, "")
    .replace(/^Secondary\s*\d*\s*:?\s*/i, "")
    .trim() || fallback;
}

/** ---------- Main Page ---------- */
export default function RailwaysPage() {
  const [data, setData] = useState<DataShape | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/data/railways.json")
      .then((r) => r.json())
      .then((d: DataShape) => setData(d))
      .catch(() => setData(null));
  }, []);

  const companies = useMemo(() => {
    if (!data) return [];
    const key = q.trim().toLowerCase();
    if (!key) return data.companies;
    return data.companies.filter((c) => c.name.toLowerCase().includes(key));
  }, [data, q]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header in a translucent light card for parchment contrast */}
      <header className="flex justify-center">
        <div className="w-full max-w-2xl text-center bg-white/85 backdrop-blur-sm rounded-2xl ring-1 ring-stone-300 shadow-sm px-6 py-5">
          <h1 className="text-2xl font-semibold text-stone-900">
            UWO Railways & Investment Effects
          </h1>
          <div className="mt-3 flex justify-center">
            <input
              placeholder="Search company…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:w-96 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
      </header>

      {/* Companies */}
      <section className="space-y-6">
        {companies.map((c) => (
          <CompanyTable key={c.name} company={c} />
        ))}
        {companies.length === 0 && (
          <div className="text-center text-stone-700 text-sm">
            No companies match your search.
          </div>
        )}
      </section>

      {/* Fare Table */}
      {data && <FareTable fare={data.fare_table} />}
    </div>
  );
}

/** ---------- Company Table (simple, centered, clear columns) ---------- */
function CompanyTable({ company }: { company: Company }) {
  const thresholds = company.thresholds.map(normThreshold);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const mainLabel = cleanEffectLabel(company.main_effect.description, "Main Effect");

  return (
    <article className="rounded-2xl border border-stone-300 bg-white/80 shadow-sm overflow-hidden">
      <div className="text-center px-4 py-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">{company.name}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr className="bg-stone-50">
              <th className="px-4 py-3 text-center font-semibold text-stone-800 border-r-2 border-stone-300">
                Effect
              </th>
              {thresholds.map((t, i) => (
                <th
                  key={i}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cls(
                    "px-3 py-3 text-center font-semibold text-stone-800",
                    "border-l border-stone-300",
                    i % 2 === 0 ? "bg-white" : "bg-stone-50/70",
                    hoverCol === i && "bg-emerald-50"
                  )}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Main EFFECT NAME instead of "Main" */}
            <tr className="border-t border-stone-200">
              <td className="px-4 py-3 text-center text-stone-900 font-medium border-r-2 border-stone-300">
                {mainLabel}
              </td>
              {company.main_effect.values.slice(0, thresholds.length).map((v, i) => (
                <td
                  key={`main-${i}`}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cls(
                    "px-3 py-3 text-center text-stone-900",
                    "border-l border-stone-300",
                    i % 2 === 0 ? "bg-white" : "bg-stone-50/70",
                    hoverCol === i && "bg-emerald-50"
                  )}
                >
                  {renderSimpleCell(v)}
                </td>
              ))}
            </tr>

            {/* Secondary EFFECT NAMES instead of "Secondary 1/2" */}
            {company.secondary_effects.map((s, rowIdx) => {
              const secLabel = cleanEffectLabel(s.description, `Secondary ${rowIdx + 1}`);
              return (
                <tr key={rowIdx} className="border-t border-stone-200">
                  <td className="px-4 py-3 text-center text-stone-900 border-r-2 border-stone-300">
                    {secLabel}
                  </td>
                  {s.values.slice(0, thresholds.length).map((v, i) => (
                    <td
                      key={`sec-${rowIdx}-${i}`}
                      onMouseEnter={() => setHoverCol(i)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={cls(
                        "px-3 py-3 text-center text-stone-900",
                        "border-l border-stone-300",
                        i % 2 === 0 ? "bg-white" : "bg-stone-50/70",
                        hoverCol === i && "bg-emerald-50"
                      )}
                    >
                      {renderSimpleCell(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function renderSimpleCell(v: string | null) {
  if (!v) return <span className="text-stone-500">—</span>;
  const val = v.trim();
  if (val.toUpperCase() === "X")
    return <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">✓</span>;
  if (/%$/.test(val)) return <span className="font-semibold">{val}</span>;
  return <span>{val.replace(/\n/g, " ")}</span>;
}

/** ---------- Fare Table (simple, centered, strong column marks) ---------- */
function FareTable({ fare }: { fare: FareRow[] }) {
  const discounts = fare.map((r) => parsePercentFromLabel(r.discount)).filter((n) => Number.isFinite(n)) as number[];
  const min = Math.min(...discounts);
  const max = Math.max(...discounts);
  const [pct, setPct] = useState(0);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const snap = (n: number) => Math.round(n / 5) * 5;

  return (
    <section className="rounded-2xl border border-stone-300 bg-white/80 shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-stone-200 text-center space-y-2">
        <h3 className="text-lg font-semibold text-stone-900">Railway Fare (Ducats)</h3>
        <div className="mx-auto max-w-md">
          <label className="text-xs text-stone-700 block mb-1">
            Highlight discount tier: <span className="text-stone-900 font-medium">{snap(pct)}%</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr className="bg-stone-50">
              <th className="px-4 py-3 text-center font-semibold text-stone-800 border-r-2 border-stone-300">
                Discount
              </th>
              {regions.map((r, i) => (
                <th
                  key={r}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cls(
                    "px-3 py-3 text-center font-semibold text-stone-800",
                    "border-l border-stone-300",
                    i % 2 === 0 ? "bg-white" : "bg-stone-50/70",
                    hoverCol === i && "bg-emerald-50"
                  )}
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fare.map((row, ridx) => {
              const d = parsePercentFromLabel(row.discount);
              const active = d === snap(pct);
              return (
                <tr key={ridx} className={cls("border-t border-stone-200", active && "bg-emerald-50/40")}>
                  <td className="px-4 py-3 text-center text-stone-900 font-medium border-r-2 border-stone-300">
                    {row.discount ?? "—"}
                  </td>
                  {regions.map((r, i) => (
                    <td
                      key={r}
                      onMouseEnter={() => setHoverCol(i)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={cls(
                        "px-3 py-3 text-center text-stone-900",
                        "border-l border-stone-300",
                        i % 2 === 0 ? "bg-white" : "bg-stone-50/70",
                        hoverCol === i && "bg-emerald-50"
                      )}
                    >
                      {formatMoney(parseMoneyToNumber(row[r]))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}