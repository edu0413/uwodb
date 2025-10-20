// /app/components/Footer.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const CREDITS: { label: string; href: string }[] = [
  { label: "Papaya UWO Guides", href: "https://uwo.papayaplay.com/uwo.do?tp=guide" },
  { label: "Railway UWO (TinyURL)", href: "https://tinyurl.com/RailwayUWO" },
  { label: "UWO HQ Blogspot", href: "https://uwo-hq.blogspot.com/" },
  { label: "UWO Guides (Webnode)", href: "https://uwoguides.webnode.page/" },
  { label: "All Discoveries (TinyURL)", href: "https://tinyurl.com/AllDiscos" },
  { label: "uwodb (ivyro)", href: "http://uwodb.ivyro.net/" },
  { label: "GVO GameDB Wiki", href: "http://gvo.gamedb.info/wiki/" },
  { label: "GVDB", href: "https://gvdb.mydns.jp/" },
  { label: "Blue’s Adventure List (TinyURL)", href: "https://tinyurl.com/bluesadvlist" },
  { label: "Uncharted Waters Fandom", href: "https://unchartedwaters.fandom.com" },
  { label: "DBGAMES UWO", href: "https://dbgames.info/uwo/" },
  { label: "Ali’s Plunder Blog", href: "https://alisplunder.blogspot.com/" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} font-sans bg-black`}>
      <footer className="border-t border-gray-700/70 py-8 text-sm text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Credits */}
          <section aria-labelledby="credits-title" className="space-y-3">
            <h2 id="credits-title" className="text-gray-300 font-semibold">
              Sources & Credits
            </h2>
            <p className="text-gray-400/90">
              This website’s information would not be possible without the incredible work of these communities and resources.
              They’re 100% worth checking out:
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CREDITS.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md border border-gray-700/70 bg-gray-900/40 px-3 py-2 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-900/70 transition"
                    title={label}
                  >
                    <span className="truncate">{label}</span>
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="ml-2 h-3.5 w-3.5 opacity-70"
                      fill="currentColor"
                    >
                      <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69L8.22 10.47a.75.75 0 1 0 1.06 1.06l6.97-6.97V7.25a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 17 2h-4.5z" />
                      <path d="M3.5 4A1.5 1.5 0 0 0 2 5.5v11A1.5 1.5 0 0 0 3.5 18h11a1.5 1.5 0 0 0 1.5-1.5V11a.75.75 0 0 0-1.5 0v5.25a.25.25 0 0 1-.25.25h-11a.25.25 0 0 1-.25-.25v-11a.25.25 0 0 1 .25-.25H9a.75.75 0 0 0 0-1.5H3.5z" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Legal + Social */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-2">© {year} Indies At War. All rights reserved.</div>

              {/* Legal links */}
              <div className="mt-2 flex flex-wrap justify-center items-center gap-2 text-gray-500">
                <Link href="/terms" className="hover:underline px-1">Terms</Link>
                <span className="hidden sm:inline">|</span>
                <Link href="/privacy" className="hover:underline px-1">Privacy</Link>
                <span className="hidden sm:inline">|</span>
                <Link href="/eula" className="hover:underline px-1">EULA</Link>
                <span className="hidden sm:inline">|</span>
                <Link href="/cookiepolicy" className="hover:underline px-1">Cookies</Link>
                <span className="hidden sm:inline">|</span>
                <Link href="/refundpolicy" className="hover:underline px-1">Refunds & Returns</Link>
                <span className="hidden sm:inline">|</span>
                <Link href="/shipping" className="hover:underline px-1">Shipping</Link>
              </div>
            </div>

            {/* Social links */}
            <div className="flex justify-center items-center gap-4">
              {/* Instagram */}
              <a
                href="https://instagram.com/IndiesAtWar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="text-gray-500 hover:text-white transition group"
              >
                <img
                  src="/socials/Instagram.svg"
                  alt=""
                  className="w-5 h-5 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                  width={20}
                  height={20}
                />
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@IndiesAtWar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                title="TikTok"
                className="text-gray-500 hover:text-white transition group"
              >
                <img
                  src="/socials/Tiktok.svg"
                  alt=""
                  className="w-5 h-5 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                  width={20}
                  height={20}
                />
              </a>

              {/* X (Twitter) */}
              <a
                href="https://x.com/IndiesAtWar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                title="X (Twitter)"
                className="text-gray-500 hover:text-white transition group"
              >
                <img
                  src="/socials/X.svg"
                  alt=""
                  className="w-5 h-5 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                  width={20}
                  height={20}
                />
              </a>

              {/* Reddit */}
              <a
                href="https://reddit.com/r/IndiesAtWar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Reddit"
                title="Reddit"
                className="text-gray-500 hover:text-white transition group"
              >
                <img
                  src="/socials/Reddit.svg"
                  alt=""
                  className="w-5 h-5 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                  width={20}
                  height={20}
                />
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@IndiesAtWar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                title="YouTube"
                className="text-gray-500 hover:text-white transition group"
              >
                <img
                  src="/socials/Youtube.svg"
                  alt=""
                  className="w-5 h-5 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                  width={20}
                  height={20}
                />
              </a>

              {/* Discord */}
              <a
                href="https://discord.gg/IndiesAtWar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                title="Discord"
                className="text-gray-500 hover:text-white transition group"
              >
                <img
                  src="/socials/Discord.svg"
                  alt=""
                  className="w-5 h-5 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                  width={20}
                  height={20}
                />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
