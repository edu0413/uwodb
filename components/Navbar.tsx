"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Moon, Sun } from "lucide-react";

/** Utility to get PDT time parts safely on the client */
function getPDTParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtHMS = (h: number, m: number, s: number) => `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
const fmtHM = (h: number, m: number) => `${pad2(h)}:${pad2(m)}`;
const fmtMMSS = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad2(m)}:${pad2(s)}`;
};

/** Season: anchor at a real PDT date/time, then alternate 11h (Summer) / 9h (Winter).
 *  Update ANCHOR_* if you confirm a different boundary, or SUMMER_HOURS if it's 10h.
 */
function useSeason(now: Date) {
  const p = getPDTParts(now);

  // ---- Config ----
  const SUMMER_HOURS = 11; // set to 10 if you later confirm
  const WINTER_HOURS = 9;

  // Absolute anchor = first confirmed START OF SUMMER in PDT:
  // Oct 4, 2025 at 03:30 PDT (from your notes)
  const ANCHOR_Y = 2025;
  const ANCHOR_M = 10; // 1..12
  const ANCHOR_D = 4;
  const ANCHOR_MIN_OF_DAY = 3 * 60 + 30; // 03:30 (start of Summer)

  const SUMMER_MIN = SUMMER_HOURS * 60;
  const WINTER_MIN = WINTER_HOURS * 60;
  const PATTERN_MIN = SUMMER_MIN + WINTER_MIN; // 20h with 11/9

  // --- Minutes since anchor in PDT calendar space ---
  // Use UTC midnights to get day delta between PDT calendar dates (no TZ drift because both sides use the same method).
  const daysSinceAnchor =
    Math.floor(
      (Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(ANCHOR_Y, ANCHOR_M - 1, ANCHOR_D)
    ) / 86400000);

  const minutesToday = p.hour * 60 + p.minute + p.second / 60;
  let totalMin = daysSinceAnchor * 1440 + minutesToday - ANCHOR_MIN_OF_DAY;

  // Normalize into [0, PATTERN_MIN)
  totalMin = ((totalMin % PATTERN_MIN) + PATTERN_MIN) % PATTERN_MIN;

  // Determine where we are within [Summer, Winter]
  const inSummer = totalMin < SUMMER_MIN;
  const season = inSummer ? "Summer" : "Winter";
  const periodMin = inSummer ? SUMMER_MIN : WINTER_MIN;
  const sinceLast = inSummer ? totalMin : totalMin - SUMMER_MIN;

  const toNextChangeMin = periodMin - sinceLast;

  // Next-change clock label in PDT
  const nextTotalMin = (minutesToday + toNextChangeMin) % (24 * 60);
  const nextH = Math.floor(nextTotalMin / 60);
  const nextM = Math.floor(nextTotalMin % 60);

  const progress = Math.max(0, Math.min(1, sinceLast / periodMin)); // 0..1

  return {
    season,
    nextChangeLabel: fmtHM(nextH, nextM) + " PDT",
    timeToNextChange: fmtMMSS(Math.max(0, Math.round(toNextChangeMin * 60))),
    progress,
  };
}


/** Port day/night: 15-min cycles (900s). Night = last 2 min [13..14:59] + first 3 min [0..2:59].
 *  Also return progress [0..1] through the 15-min cycle.
 */
function usePortPhase(now: Date) {
  const p = getPDTParts(now);
  const w = p.minute % 15;
  const secInCycle = w * 60 + p.second; // 0..899

  const isNight = w === 13 || w === 14 || w <= 2;

  let secsToFlip: number;
  if (isNight) {
    secsToFlip = secInCycle >= 780 ? 900 - secInCycle : 180 - secInCycle;
  } else {
    secsToFlip = 780 - secInCycle;
  }

  let progress: number;
  if (isNight) {
    // Night lasts 5 minutes (300s): covers [780..899] + [0..179]
    if (secInCycle >= 780) progress = (secInCycle - 780) / 300; // 780→900
    else progress = (secInCycle + 120) / 300; // 0→179 (wrap)
  } else {
    // Day lasts 10 minutes (600s): covers [180..779]
    progress = (secInCycle - 180) / 600;
  }
  progress = Math.max(0, Math.min(1, progress));

  return {
    phase: isNight ? "Night" : "Day",
    icon: isNight ? "moon" : "sun",
    timeToFlip: fmtMMSS(secsToFlip),
    progress, // 0..1 clockwise ring
  };
}

/** Build a conic-gradient ring for a clockwise fill. */
function ringStyle(progress: number) {
  // clamp and convert to degrees (start at top: -90deg)
  const clamped = Math.min(1, Math.max(0, progress));
  const deg = clamped * 360;
  // "RGB-like" bright fill → you can tweak the two colors below
  return {
    backgroundImage: `conic-gradient(from -90deg, rgb(59,130,246) 0deg, rgb(16,185,129) ${deg}deg, rgba(255,255,255,0.09) ${deg}deg 360deg)`,
  } as React.CSSProperties;
}

export default function Navbar() {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = useMemo(() => getPDTParts(now), [now]);
  const season = useSeason(now);
  const port = usePortPhase(now);

  const timeLabel = fmtHMS(p.hour, p.minute, p.second) + " PDT";

  return (
    <header className="w-full bg-black font-mono backdrop-blur-md border-b border-[#8b7355] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo → uwodb.indiesatwar.com */}
        <Link
          href="https://uwodb.indiesatwar.com"
          className="flex items-center space-x-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          aria-label="Go to UWO Database home"
        >
          <div className="relative w-32 h-8 sm:w-56 sm:h-10">
            <Image
              src="/IaWHeaderLogo.png"
              alt="Indies at War"
              fill
              priority
              className="object-contain"
            />
          </div>
        </Link>

        {/* Info pills (desktop) */}
        <div className="hidden md:flex items-end gap-4">
          {/* Server Time */}
          <div className="flex flex-col items-center leading-tight">
            <div className="px-3 py-1.5 rounded-full bg-zinc-900/80 text-white shadow-sm border border-zinc-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4" aria-hidden />
              <span className="tabular-nums">{timeLabel}</span>
            </div>
            <span className="mt-1 text-[10px] text-zinc-400 uppercase tracking-wide">
              Server Time
            </span>
          </div>

          {/* Season (with clockwise border fill) */}
          <div className="flex flex-col items-center leading-tight">
            <div
              className="p-[2px] rounded-full"
              style={ringStyle(season.progress)}
              aria-hidden
            >
              <div
                className="px-3 py-1.5 rounded-full bg-zinc-950/80 text-white shadow-sm border border-zinc-800 flex items-center gap-1.5"
                title={`Next: ${season.nextChangeLabel} (${season.timeToNextChange})`}
              >
                <Calendar className="w-4 h-4" aria-hidden />
                <span>{season.season}</span>
              </div>
            </div>
            <span className="mt-1 text-[10px] text-zinc-400 uppercase tracking-wide">
              Current Season
            </span>
          </div>

          {/* Port phase (with clockwise border fill) */}
          <div className="flex flex-col items-center leading-tight">
            <div
              className="p-[2px] rounded-full"
              style={ringStyle(port.progress)}
              aria-hidden
            >
              <div
                className="px-3 py-1.5 rounded-full bg-zinc-950/80 text-white shadow-sm border border-zinc-800 flex items-center gap-1.5"
                title={`Flip in ${port.timeToFlip}`}
              >
                {port.icon === "sun" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{port.phase}</span>
              </div>
            </div>
            <span className="mt-1 text-[10px] text-zinc-400 uppercase tracking-wide">
              In Port
            </span>
          </div>
        </div>

        {/* Compact mobile row */}
        <div className="md:hidden flex items-center gap-3 text-white text-[12px]">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className="tabular-nums">{fmtHM(p.hour, p.minute)} PDT</span>
          </div>
          <div className="flex items-center gap-1">
            {port.icon === "sun" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{port.phase}</span>
          </div>
        </div>
      </div>
    </header>
  );
}