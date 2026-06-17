"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Gauge, History, Radar, Search, Settings, SlidersHorizontal, ClipboardCheck } from "lucide-react"
import type { ReactNode } from "react"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge, active: true },
  { label: "Markets", href: "/markets", icon: BarChart3, active: true },
  { label: "Scanner", href: "/scanner", icon: Radar, active: true },
  { label: "Trade", href: "/trade", icon: ClipboardCheck, active: true },
  { label: "Research", href: "/research", icon: Search, active: true },
  { label: "Replay", href: "/replay", icon: History, active: true },
  { label: "Settings", icon: Settings, active: false },
]

function navClass(active: boolean, selected: boolean) {
  if (!active) return "border-zinc-900 bg-zinc-950/40 text-zinc-700"
  if (selected) return "border-cyan-300/35 bg-cyan-400/10 text-cyan-100"
  return "border-zinc-900 bg-black/35 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
}

export function TerminalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-black text-white">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[76px] border-r border-zinc-900 bg-zinc-950/95 px-2 py-3 xl:block">
        <div className="mb-4 flex h-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10">
          <SlidersHorizontal className="h-4 w-4 text-cyan-100" />
        </div>
        <nav className="grid gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const selected = Boolean(item.active && item.href && (pathname === item.href || pathname === "/" && item.href === "/dashboard"))
            const content = (
              <div className={`group flex h-12 flex-col items-center justify-center gap-1 rounded-lg border transition ${navClass(item.active, selected)}`}>
                <Icon className="h-4 w-4" />
                <span className="text-[8px] font-black uppercase tracking-[0.08em]">{item.label.split(" ")[0]}</span>
              </div>
            )

            if (!item.active || !item.href) {
              return <div key={item.label} aria-disabled="true" title={`${item.label} not ready`}>{content}</div>
            }

            return (
              <Link key={item.label} href={item.href} aria-label={item.label}>
                {content}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="xl:pl-[76px]">
        <div className="sticky top-0 z-30 border-b border-zinc-900 bg-black/95 px-3 py-2 xl:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const selected = Boolean(item.active && item.href && (pathname === item.href || pathname === "/" && item.href === "/dashboard"))
              const content = (
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${navClass(item.active, selected)}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              )
              if (!item.active || !item.href) return <div key={item.label} aria-disabled="true">{content}</div>
              return <Link key={item.label} href={item.href}>{content}</Link>
            })}
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}
