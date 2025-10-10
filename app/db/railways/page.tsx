"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

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

/** ---------- Main Page (dark UI like Sailor Equipment) ---------- */
export default function RailwaysPage() {
  const [data, setData] = useState<DataShape | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/railways.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load /data/railways.json");
        return r.json();
      })
      .then((d: DataShape) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const companies = useMemo(() => {
    if (!data) return [];
    const key = q.trim().toLowerCase();
    if (!key) return data.companies;
    return data.companies.filter((c) => c.name.toLowerCase().includes(key));
  }, [data, q]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">UWO Railways & Investment Effects</h1>
            <p className="mt-1 text-slate-400">Search companies and view their main & secondary effects by threshold.</p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company…"
              className="w-full rounded-2xl bg-slate-900/60 px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-slate-400">
          {loading ? "Loading…" : error ? <span className="text-rose-400">{error}</span> : (
            <>Showing <span className="text-slate-200 font-medium">{companies.length}</span>{data ? <> of {data.companies.length}</> : null} companies</>
          )}
        </div>

        {/* Companies */}
        <section className="mt-6 grid grid-cols-1 gap-4">
          {companies.map((c) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm"
            >
              <CompanyTable company={c} />
            </motion.div>
          ))}

          {!loading && !error && companies.length === 0 && (
            <div className="mt-8 text-center text-slate-400">No companies match your search.</div>
          )}
        </section>

        {/* Fare Table */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm"
          >
            <FareTable fare={data.fare_table} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** ---------- Company Table (dark, compact, with hoverable columns) ---------- */
function CompanyTable({ company }: { company: Company }) {
  const thresholds = company.thresholds.map(normThreshold);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const mainLabel = cleanEffectLabel(company.main_effect.description, "Main Effect");

  return (
    <article>
      <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <h2 className="text-lg font-semibold text-slate-100">{company.name}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr className="bg-slate-900/40">
              <th className="px-4 py-3 text-center font-semibold text-slate-200 border-r-2 border-slate-800">Effect</th>
              {thresholds.map((t, i) => (
                <th
                  key={i}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cls(
                    "px-3 py-3 text-center font-semibold text-slate-200",
                    "border-l border-slate-800",
                    i % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10",
                    hoverCol === i && "bg-indigo-950/40"
                  )}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Main EFFECT NAME */}
            <tr className="border-t border-slate-800">
              <td className="px-4 py-3 text-center text-slate-100 font-medium border-r-2 border-slate-800">
                {mainLabel}
              </td>
              {company.main_effect.values.slice(0, thresholds.length).map((v, i) => (
                <td
                  key={`main-${i}`}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cls(
                    "px-3 py-3 text-center text-slate-100",
                    "border-l border-slate-800",
                    i % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10",
                    hoverCol === i && "bg-indigo-950/40"
                  )}
                >
                  {renderSimpleCell(v)}
                </td>
              ))}
            </tr>

            {/* Secondary EFFECTS */}
            {company.secondary_effects.map((s, rowIdx) => {
              const secLabel = cleanEffectLabel(s.description, `Secondary ${rowIdx + 1}`);
              return (
                <tr key={rowIdx} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-center text-slate-200 border-r-2 border-slate-800">
                    {secLabel}
                  </td>
                  {s.values.slice(0, thresholds.length).map((v, i) => (
                    <td
                      key={`sec-${rowIdx}-${i}`}
                      onMouseEnter={() => setHoverCol(i)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={cls(
                        "px-3 py-3 text-center text-slate-100",
                        "border-l border-slate-800",
                        i % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10",
                        hoverCol === i && "bg-indigo-950/40"
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
  if (!v) return <span className="text-slate-400">—</span>;
  const val = v.trim();
  if (val.toUpperCase() === "X")
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
        ✓
      </span>
    );
  if (/%$/.test(val)) return <span className="font-semibold text-slate-100">{val}</span>;
  return <span className="text-slate-100">{val.replace(/\n/g, " ")}</span>;
}

/** ---------- Fare Table (dark, with slider highlight) ---------- */
function FareTable({ fare }: { fare: FareRow[] }) {
  const discounts = fare
    .map((r) => parsePercentFromLabel(r.discount))
    .filter((n) => Number.isFinite(n)) as number[];
  const min = discounts.length ? Math.min(...discounts) : 0;
  const max = discounts.length ? Math.max(...discounts) : 100;
  const [pct, setPct] = useState(0);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const snap = (n: number) => Math.round(n / 5) * 5;

  return (
    <section>
      <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/60 text-center space-y-3">
        <h3 className="text-lg font-semibold text-slate-100">Railway Fare (Ducats)</h3>
        <div className="mx-auto max-w-md">
          <label className="text-xs text-slate-400 block mb-1">
            Highlight discount tier: <span className="text-slate-200 font-medium">{snap(pct)}%</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr className="bg-slate-900/40">
              <th className="px-4 py-3 text-center font-semibold text-slate-200 border-r-2 border-slate-800">
                Discount
              </th>
              {regions.map((r, i) => (
                <th
                  key={r}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cls(
                    "px-3 py-3 text-center font-semibold text-slate-200",
                    "border-l border-slate-800",
                    i % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10",
                    hoverCol === i && "bg-indigo-950/40"
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
                <tr key={ridx} className={cls("border-t border-slate-800", active && "bg-indigo-950/20")}>  
                  <td className="px-4 py-3 text-center text-slate-100 font-medium border-r-2 border-slate-800">
                    {row.discount ?? "—"}
                  </td>
                  {regions.map((r, i) => (
                    <td
                      key={r}
                      onMouseEnter={() => setHoverCol(i)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={cls(
                        "px-3 py-3 text-center text-slate-100",
                        "border-l border-slate-800",
                        i % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10",
                        hoverCol === i && "bg-indigo-950/40"
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