"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Ship,
  TrainFront,
  ScrollText,
  Clock,
  TrendingUp,
  TrendingDown,
  Trophy,
  Medal,
  ChevronRight,
} from "lucide-react";

/* ===================== Types ===================== */
type CountInfo = { count: number | null; updatedAt: string | null };

type Nation = {
  name: string;
  value: number;
  changePct?: number | null;
  slug?: string;
  flag?: string;
};

type InfluencePayload = {
  updatedAt?: string;
  nations?: Nation[];
  // flexible fallbacks:
  items?: Nation[];
  data?: { nations?: Nation[] } | Nation[];
};

type LBRow = {
  rank?: number;
  character?: string;
  name?: string;
  company?: string;
  value?: number | string;
  score?: number | string;
  fame?: number | string;
  merits?: number | string;
};
type LeaderboardPayload = {
  updatedAt?: string;
  rows?: LBRow[];
  items?: LBRow[];
  data?: LBRow[] | { rows?: LBRow[] };
};

/* ===================== Helpers ===================== */
const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US"));
const pct = (p?: number | null) =>
  p == null || Number.isNaN(p) ? "—" : `${p.toFixed(1)}%`;

function formatDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function fetchJSON(path: string): Promise<any | null> {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (r.ok) return await r.json();
  } catch {}
  return null;
}
async function fetchFirstJSON(paths: string[]) {
  for (const p of paths) {
    const j = await fetchJSON(p);
    if (j) return j;
  }
  return null;
}
function extractUpdatedAt(j: any): string | null {
  return j?.updatedAt || j?.lastUpdated || j?.generatedAt || j?.meta?.updatedAt || null;
}

/* ---- Count extractors for mini cards ---- */
function extractCountGeneric(j: any, primaryKeys: string[]): number | null {
  if (!j) return null;
  if (Array.isArray(j)) return j.length;
  for (const k of primaryKeys) {
    const v = j?.[k];
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === "object") return Object.keys(v).length;
    if (typeof v === "number") return v;
  }
  if (typeof j === "object") {
    const keys = Object.keys(j);
    if (keys.length > 1) return keys.length;
  }
  return null;
}

async function getShipsStats(): Promise<CountInfo> {
  const json = await fetchFirstJSON(["/data/ships.json", "/data/ships.min.json", "/data/Ships.json", "/data/ships-db.json"]);
  return { count: extractCountGeneric(json, ["ships", "data", "items"]), updatedAt: extractUpdatedAt(json) };
}
async function getSkillsStats(): Promise<CountInfo> {
  const json = await fetchFirstJSON(["/data/skills.json", "/data/ship_skills.json", "/data/skills.min.json"]);
  return { count: extractCountGeneric(json, ["skills", "optionalSkills", "data", "items"]), updatedAt: extractUpdatedAt(json) };
}
async function getRailwaysStats(): Promise<CountInfo> {
  const json = await fetchFirstJSON(["/data/railways.json"]);
  const count = (Array.isArray(json?.companies) && json.companies.length) || extractCountGeneric(json, ["companies", "data"]);
  return { count, updatedAt: extractUpdatedAt(json) };
}

/* ---- Influence parsing ---- */
function toSlug(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function numberish(x: any): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/[, ]+/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}
function parseInfluence(j: InfluencePayload | null): { updatedAt: string | null; nations: Nation[] } {
  if (!j) return { updatedAt: null, nations: [] };
  const updatedAt = extractUpdatedAt(j as any);
  let arr: any[] =
    (Array.isArray(j?.nations) && (j as any).nations) ||
    (Array.isArray(j?.items) && (j as any).items) ||
    (Array.isArray((j as any)?.data) && (j as any).data) ||
    (Array.isArray((j as any)?.data?.nations) && (j as any).data.nations) ||
    [];
  const nations: Nation[] = arr.map((x: any) => {
    const name = x.name || x.nation || "Unknown";
    const val = numberish(x.value ?? x.influence ?? x.score);
    const change = x.changePct ?? x.change ?? x.delta ?? null;
    const slug = x.slug || toSlug(name);
    const flag = x.flag || `/images/flags/${slug}.png`; // your current flag path
    return { name, value: val, changePct: change == null ? null : Number(change), slug, flag };
  });
  return { updatedAt, nations };
}

/* ---- Leaderboard parsing ---- */
function parseLeaderboard(j: LeaderboardPayload | null): { updatedAt: string | null; rows: Required<LBRow>[] } {
  if (!j) return { updatedAt: null, rows: [] };
  const updatedAt = extractUpdatedAt(j as any);

  let arr: any[] =
    (Array.isArray(j?.rows) && j.rows) ||
    (Array.isArray(j?.items) && j.items) ||
    (Array.isArray(j?.data) && (j.data as any)) ||
    (Array.isArray((j as any)?.data?.rows) && (j as any).data.rows) ||
    [];

  const rows: Required<LBRow>[] = arr.slice(0, 50).map((r: any, i: number) => {
    const name = r.character || r.name || r.company || `#${i + 1}`;
    const rawVal = r.value ?? r.score ?? r.fame ?? r.merits ?? null;
    const val = rawVal == null ? "—" : typeof rawVal === "number" ? rawVal.toLocaleString("en-US") : String(rawVal);
    const rank = numberish(r.rank) || i + 1;
    return { rank, character: name, name, company: r.company, value: val, score: "", fame: "", merits: "" };
  });

  return { updatedAt, rows };
}

/* ===================== Micro-animations ===================== */
function useMountFade(delay = 0) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2";
}

function useCountUp(target: number, duration = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = target || 0;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

/* ===================== Reusable UI bits ===================== */
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl bg-white/90 ring-1 ring-stone-300 shadow-md overflow-hidden ${className}`}
    >
      {children}
    </motion.section>
  );
}

function CTA({
  href,
  title,
  descr,
  Icon,
}: {
  href: string;
  title: string;
  descr: string;
  Icon: React.ComponentType<any>;
}) {
  return (
    <Link href={href} className="group rounded-xl bg-white ring-1 ring-stone-300 hover:ring-emerald-400 transition shadow-sm px-5 py-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none" />
      <div className="flex items-center justify-center gap-2 text-stone-900">
        <Icon className="h-5 w-5" />
        <span className="font-medium">{title}</span>
      </div>
      <div className="mt-1 text-xs text-stone-600">{descr}</div>
      <ChevronRight className="h-4 w-4 text-stone-400 absolute right-3 top-3 group-hover:text-emerald-500 transition" />
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  Icon?: React.ComponentType<any>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl bg-white/90 ring-1 ring-stone-300 shadow-sm px-4 py-4 text-center"
    >
      <div className="text-[11px] uppercase tracking-wide text-stone-500 flex items-center gap-2 justify-center">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-stone-900">{value}</div>
      {sub && (
        <div className="mt-1 text-xs text-stone-600 flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" />
          {sub}
        </div>
      )}
    </motion.div>
  );
}

/* ===================== Nation Influence ===================== */
function NationInfluence() {
  const [payload, setPayload] = useState<{ updatedAt: string | null; nations: Nation[] }>({
    updatedAt: null,
    nations: [],
  });

  useEffect(() => {
    (async () => {
      const j = await fetchFirstJSON(["/data/nation_influence.json", "/data/nation-influence.json", "/data/influence.json"]);
      setPayload(parseInfluence(j));
    })();
  }, []);

  const max = useMemo(() => (payload.nations.length ? Math.max(...payload.nations.map(n => n.value || 0)) : 0), [payload.nations]);
  const fade = useMountFade(50);

  return (
    <SectionCard>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          Nation Influence
        </div>
        <div className="text-[11px] text-stone-600 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Last updated: <span className="font-medium">{formatDate(payload.updatedAt)}</span>
        </div>
      </div>

      <div className={["grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 transition", fade].join(" ")}>
        {payload.nations.map((n, i) => (
          <InfluenceCard key={n.name + i} nation={n} index={i} max={max} />
        ))}
        {payload.nations.length === 0 && (
          <div className="text-center text-stone-600 text-sm col-span-full py-4">
            Drop <code className="font-mono">/data/nation_influence.json</code> to populate.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function InfluenceCard({ nation, index, max }: { nation: Nation; index: number; max: number }) {
  const value = useCountUp(nation.value || 0, 700 + index * 60);
  const change = typeof nation.changePct === "number" ? nation.changePct : null;
  const up = change != null && change >= 0;
  const down = change != null && change < 0;
  const ratio = max ? Math.max(0.06, Math.min(1, (nation.value || 0) / max)) : 0;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-xl ring-1 ring-stone-300 bg-white shadow-sm p-3 flex items-center gap-3"
    >
      <img
        src={nation.flag || `/images/flags/${nation.slug}.png`}
        alt={nation.name}
        className="h-8 w-12 object-cover rounded ring-1 ring-stone-300"
      />

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-stone-700 uppercase truncate">{nation.name}</div>
        <div className="flex items-baseline gap-2">
          <div className="text-lg font-semibold text-stone-900">{value.toLocaleString("en-US")}</div>
          {change != null && (
            <span className={up ? "text-emerald-700 text-xs font-medium inline-flex items-center gap-1" : down ? "text-rose-700 text-xs font-medium inline-flex items-center gap-1" : "text-stone-600 text-xs"}>
              {up ? <TrendingUp className="h-3.5 w-3.5" /> : down ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              {pct(Math.abs(change))}
            </span>
          )}
        </div>
        <div className="mt-2 h-2 rounded-full bg-stone-100 ring-1 ring-stone-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.6, delay: 0.05 * index }}
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ===================== Generic Leaderboard ===================== */
function Leaderboard({
  title,
  sources,
  rightNote,
  medal = true,
  maxRows = 5,
}: {
  title: string;
  sources: string[]; // candidate JSON paths
  rightNote?: string;
  medal?: boolean;
  maxRows?: number;
}) {
  const [data, setData] = useState<{ updatedAt: string | null; rows: Required<LBRow>[] }>({
    updatedAt: null,
    rows: [],
  });

  const fade = useMountFade(50);

  useEffect(() => {
    (async () => {
      const j = await fetchFirstJSON(sources);
      setData(parseLeaderboard(j));
    })();
  }, [sources]);

  function RankBadge({ rank }: { rank: number }) {
    const gradient =
      rank === 1
        ? "from-amber-400 to-amber-600 text-white"
        : rank === 2
        ? "from-slate-300 to-slate-500 text-stone-800"
        : rank === 3
        ? "from-orange-300 to-orange-600 text-white"
        : "from-stone-200 to-stone-400 text-stone-800";

    return (
      <div
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ring-1 ring-black/5 shadow`}
        aria-label={`Rank ${rank}`}
        title={`Rank ${rank}`}
      >
        <span className="text-sm font-bold leading-none">{rank}</span>
      </div>
    );
  }

  return (
    <SectionCard className={fade}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-600" />
          {title}
        </div>
        <div className="text-[11px] text-stone-600 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Updated: <span className="font-medium">{formatDate(data.updatedAt)}</span>
          {rightNote ? <span className="ml-2 text-stone-500">{rightNote}</span> : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-stone-50">
              <th className="px-3 py-2 text-center font-semibold text-stone-700 w-20">Rank</th>
              <th className="px-3 py-2 text-left font-semibold text-stone-700">Character / Company</th>
              <th className="px-3 py-2 text-right font-semibold text-stone-700">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, maxRows).map((r, i) => {
              const top =
                r.rank === 1 ? "bg-amber-50" : r.rank === 2 ? "bg-slate-50" : r.rank === 3 ? "bg-orange-50" : "";
              const badge =
                r.rank === 1
                  ? "bg-amber-100 text-amber-800"
                  : r.rank === 2
                  ? "bg-slate-200 text-slate-800"
                  : r.rank === 3
                  ? "bg-orange-100 text-orange-800"
                  : "bg-stone-200 text-stone-700";
              return (
                <tr key={i} className={`border-t border-stone-200 hover:bg-stone-50/60 transition ${top}`}>
                  <td className="px-3 py-3 text-center">
                    <RankBadge rank={r.rank} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-stone-900 font-semibold text-[15px] md:text-base leading-tight tracking-tight">
                      {r.character}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-stone-900 font-medium">{r.value ?? "—"}</td>
                </tr>
              );
            })}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-stone-600 text-sm">
                  Drop JSON in <code className="font-mono">{sources.join(" or ")}</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

/* ===================== Page ===================== */
export default function Home() {
  const [ships, setShips] = useState<CountInfo>({ count: null, updatedAt: null });
  const [skills, setSkills] = useState<CountInfo>({ count: null, updatedAt: null });
  const [rails, setRails] = useState<CountInfo>({ count: null, updatedAt: null });

  useEffect(() => {
    (async () => {
      const [s, k, r] = await Promise.all([getShipsStats(), getSkillsStats(), getRailwaysStats()]);
      setShips(s);
      setSkills(k);
      setRails(r);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-[url('/textures/map-parchment.png')] bg-cover bg-fixed p-6 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <SectionCard>
          <div className="p-8 text-center relative">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl md:text-4xl font-serif text-stone-900"
            >
              ⚓ Uncharted Waters Online Database
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="mt-3 text-stone-700"
            >
              A unified knowledge hub for <em>Uncharted Waters Online</em>. Currently in <strong>testing</strong>.
            </motion.p>

            {/* Quick Explore */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CTA href="/db/ships" title="Explore Ships" descr="Stats, capacity, skills & more" Icon={Ship} />
              <CTA href="/db/railways" title="Railways & Investment" descr="Threshold effects & fares" Icon={TrainFront} />
              <CTA href="/db/skills" title="Ship Skills" descr="Original • Optional • Rebuild" Icon={ScrollText} />
            </div>
          </div>
        </SectionCard>

        {/* Mini Dashboard */}
        <section className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Ships" value={fmt(ships.count)} sub={`Updated: ${formatDate(ships.updatedAt)}`} Icon={Ship} />
            <StatCard label="Ship Skills" value={fmt(skills.count)} sub={`Updated: ${formatDate(skills.updatedAt)}`} Icon={ScrollText} />
            <StatCard label="Railway Companies" value={fmt(rails.count)} sub={`Updated: ${formatDate(rails.updatedAt)}`} Icon={TrainFront} />
          </div>
        </section>

        {/* Nation Influence */}
        <NationInfluence />

        {/* Leaderboards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Leaderboard title="Raised Shipwrecks" sources={["/data/shipwrecks.json", "/data/raised_shipwrecks.json"]} />
          <Leaderboard title="Company Fame" sources={["/data/company_fame.json", "/data/company-fame.json"]} />
          <Leaderboard title="ESF Merits of War" sources={["/data/esf_merits.json", "/data/esf-merits.json", "/data/merits_of_war.json"]} />
        </section>
      </div>
    </main>
  );
}