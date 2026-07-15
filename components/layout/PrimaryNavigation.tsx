"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BarChart3, Gauge, History, Radar, Search, SlidersHorizontal, ClipboardCheck } from "lucide-react"
import { Suspense, type ReactNode } from "react"

import { createInvestigationContext, readInvestigationContext } from "@/lib/investigation/context"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge, active: true },
  { label: "Markets", href: "/markets", icon: BarChart3, active: true },
  { label: "Scanner", href: "/scanner", icon: Radar, active: true },
  { label: "Trade", href: "/trade", icon: ClipboardCheck, active: true },
  { label: "Research", href: "/research", icon: Search, active: true },
  { label: "Replay", href: "/replay", icon: History, active: true },
]

function navClass(active: boolean, selected: boolean) {
  if (!active) return "border-zinc-900 bg-zinc-950/40 text-zinc-700"
  if (selected) return "border-cyan-300/35 bg-cyan-400/10 text-cyan-100"
  return "border-zinc-900 bg-black/35 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
}

const CONTEXT_ROUTES = new Set(["/dashboard", "/research", "/historical-intelligence", "/replay"])
const NAVIGATION_CONTEXT_TIMESTAMP = "1970-01-01T00:00:00.000Z"
const MVP_ROUTES = new Set(["/dashboard", "/markets", "/scanner", "/trade", "/replay", "/research"])
const MVP_CONTEXT_KEYS = ["instrument", "symbol", "start", "end", "candidate", "candidateId", "evidence", "evidenceId", "projection", "projectionId"]

function TerminalAppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const context = readInvestigationContext(
    searchParams,
    createInvestigationContext({
      symbol: "BTCUSDT",
      exchange: "binance_futures",
      timeframe: "1h",
      investigationTimestamp: NAVIGATION_CONTEXT_TIMESTAMP,
      investigationType: pathname === "/replay" ? "replay" : pathname === "/historical-intelligence" ? "historical_analog" : "market_state",
      source: pathname.slice(1) || "dashboard",
    }),
  )
  const itemHref = (href?: string) => {
    if (!href || !CONTEXT_ROUTES.has(href)) return href
    const investigationType = href === "/replay"
      ? "replay"
      : href === "/historical-intelligence"
        ? "historical_analog"
        : href === "/research"
          ? context.investigationType
          : "market_state"
    const params = new URLSearchParams({
      symbol: context.symbol,
      exchange: context.exchange,
      timeframe: context.timeframe,
      investigation: investigationType,
      source: href.slice(1) || "dashboard",
    })

    return `${href}?${params.toString()}`
  }
  const governedHref = (href?: string) => {
    if (!href || !MVP_ROUTES.has(href)) return itemHref(href)
    const params = new URLSearchParams()
    MVP_CONTEXT_KEYS.forEach((key) => {
      const current = searchParams.get(key)
      if (current) params.set(key, current)
    })
    if (!params.has("instrument") && params.has("symbol")) params.set("instrument", params.get("symbol")!)
    return params.size ? `${href}?${params.toString()}` : href
  }

  return (
    <div data-qt-foundation="terminal-shell" className="min-h-screen bg-black text-white">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[190px] border-r border-zinc-900 bg-zinc-950/95 px-3 py-4 xl:block">
        <div className="mb-6 flex h-11 items-center gap-3 border-b border-zinc-800 px-2">
          <SlidersHorizontal className="h-4 w-4 text-cyan-100" />
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-100">QuantTerminal</span>
        </div>
        <nav className="grid gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const selected = Boolean(item.active && item.href && (pathname === item.href || pathname === "/" && item.href === "/dashboard"))
            const content = (
              <div className={`group flex h-11 w-full items-center gap-3 overflow-hidden rounded-md border px-3 transition ${navClass(item.active, selected)}`}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            )

            if (!item.active || !item.href) {
              return <div className="w-full" key={item.label} aria-disabled="true" title={`${item.label} not ready`}>{content}</div>
            }

            return (
              <Link className="block w-full" key={item.label} href={governedHref(item.href) ?? item.href} aria-label={item.label} aria-current={selected ? "page" : undefined}>
                {content}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="xl:pl-[190px]">
        <div className="sticky top-0 z-30 border-b border-zinc-900 bg-black/95 px-3 py-2 xl:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const selected = Boolean(item.active && item.href && (pathname === item.href || pathname === "/" && item.href === "/dashboard"))
              const content = (
                <div className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${navClass(item.active, selected)}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              )
              if (!item.active || !item.href) return <div key={item.label} aria-disabled="true">{content}</div>
              return <Link key={item.label} href={governedHref(item.href) ?? item.href} aria-current={selected ? "page" : undefined}>{content}</Link>
            })}
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}

export function TerminalAppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white">{children}</div>}>
      <TerminalAppShellContent>{children}</TerminalAppShellContent>
    </Suspense>
  )
}
