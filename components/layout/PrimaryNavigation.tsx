"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import {
  createInvestigationContext,
  readInvestigationContext,
} from "@/lib/investigation/context";
import { buildMvpRouteHref, type MvpRouteView } from "@/lib/mvp-route-context";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Markets", href: "/markets", active: true },
  { label: "Research", href: "/research", active: true },
  { label: "Replay", href: "/replay", active: true },
  { label: "Scanner", href: "/scanner", active: true },
  { label: "Trade", href: "/trade", active: true },
];

function navClass(active: boolean, selected: boolean) {
  if (!active) return "border-zinc-900 bg-zinc-950/40 text-zinc-700";
  if (selected) return "border-cyan-400 bg-[#06181f] text-cyan-300";
  return "border-transparent bg-[#09120a] text-[#6e826e] hover:border-[#213021] hover:text-[#d6e0d6]";
}

const CONTEXT_ROUTES = new Set([
  "/dashboard",
  "/research",
  "/historical-intelligence",
  "/replay",
]);
const NAVIGATION_CONTEXT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const MVP_ROUTES = new Set([
  "/dashboard",
  "/markets",
  "/scanner",
  "/trade",
  "/replay",
  "/research",
]);

function TerminalAppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = readInvestigationContext(
    searchParams,
    createInvestigationContext({
      symbol: "BTCUSDT",
      exchange: "binance_futures",
      timeframe: "1h",
      investigationTimestamp: NAVIGATION_CONTEXT_TIMESTAMP,
      investigationType:
        pathname === "/replay"
          ? "replay"
          : pathname === "/historical-intelligence"
            ? "historical_analog"
            : "market_state",
      source: pathname.slice(1) || "dashboard",
    }),
  );
  const itemHref = (href?: string) => {
    if (!href || !CONTEXT_ROUTES.has(href)) return href;
    const investigationType =
      href === "/replay"
        ? "replay"
        : href === "/historical-intelligence"
          ? "historical_analog"
          : href === "/research"
            ? context.investigationType
            : "market_state";
    const params = new URLSearchParams({
      symbol: context.symbol,
      exchange: context.exchange,
      timeframe: context.timeframe,
      investigation: investigationType,
      source: href.slice(1) || "dashboard",
    });

    return `${href}?${params.toString()}`;
  };
  const governedHref = (href?: string) => {
    if (!href || !MVP_ROUTES.has(href)) return itemHref(href);
    return buildMvpRouteHref(
      href.slice(1) as MvpRouteView,
      new URLSearchParams(searchParams),
    );
  };

  return (
    <div
      data-qt-foundation="terminal-shell"
      className="min-h-screen bg-black text-white"
    >
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[190px] border-r border-[#213021] bg-[#09120a] p-4 xl:flex xl:flex-col">
        <div className="mb-3 border-b border-[#213021] pb-3">
          <span className="block font-[var(--qt-font-mono)] text-lg font-bold leading-5 text-[#d6e0d6]">
            QUANT<br />TERMINAL
          </span>
          <span className="mt-2 block font-[var(--qt-font-mono)] text-[9px] font-bold uppercase text-[#6e826e]">
            Evidence workspace
          </span>
        </div>
        <nav className="grid gap-2" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const selected = Boolean(
              item.active &&
              item.href &&
              (pathname === item.href ||
                (pathname === "/" && item.href === "/dashboard")),
            );
            const content = (
              <div
                className={`group flex h-[34px] w-full items-center gap-2 overflow-hidden border px-2.5 transition ${navClass(item.active, selected)}`}
              >
                <span className={`h-3.5 w-[3px] ${selected ? "bg-cyan-300" : "bg-[#213021]"}`} />
                <span className="font-[var(--qt-font-mono)] text-[11px] font-bold uppercase">{item.label}</span>
              </div>
            );

            if (!item.active || !item.href) {
              return (
                <div
                  className="w-full"
                  key={item.label}
                  aria-disabled="true"
                  title={`${item.label} not ready`}
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                className="block w-full"
                key={item.label}
                href={governedHref(item.href) ?? item.href}
                aria-label={item.label}
                aria-current={selected ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border border-emerald-500 px-2 py-1.5 font-[var(--qt-font-mono)] text-[9px] font-bold text-emerald-400">
          <span aria-hidden="true">●</span> SYSTEM READY
        </div>
        <p className="mt-3 font-[var(--qt-font-mono)] text-[9px] leading-4 text-[#6e826e]">
          GOVERNED PROJECTIONS<br />CONTEXT PRESERVED
        </p>
      </aside>

      <div className="xl:pl-[190px]">
        <div className="sticky top-0 z-30 border-b border-zinc-900 bg-black/95 px-3 py-2 xl:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const selected = Boolean(
                item.active &&
                item.href &&
                (pathname === item.href ||
                  (pathname === "/" && item.href === "/dashboard")),
              );
              const content = (
                <div className={`flex min-h-11 items-center gap-2 border px-3 py-2 font-[var(--qt-font-mono)] text-[10px] font-bold uppercase ${navClass(item.active, selected)}`}>
                  <span className={`h-3 w-[3px] ${selected ? "bg-cyan-300" : "bg-[#213021]"}`} />
                  {item.label}
                </div>
              );
              if (!item.active || !item.href)
                return (
                  <div key={item.label} aria-disabled="true">
                    {content}
                  </div>
                );
              return (
                <Link
                  key={item.label}
                  href={governedHref(item.href) ?? item.href}
                  aria-current={selected ? "page" : undefined}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TerminalAppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white">{children}</div>
      }
    >
      <TerminalAppShellContent>{children}</TerminalAppShellContent>
    </Suspense>
  );
}
