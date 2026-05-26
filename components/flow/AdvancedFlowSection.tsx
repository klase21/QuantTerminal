"use client"

import { ReactNode, useState } from "react"
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react"

interface AdvancedFlowSectionProps {
  title: string
  subtitle?: string
  badge?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function AdvancedFlowSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: AdvancedFlowSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-zinc-900 bg-black/45">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 border-b border-zinc-900 bg-zinc-950/70 px-4 py-3 text-left transition hover:bg-zinc-900/70"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-800 bg-black text-zinc-400">
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{title}</div>
            {subtitle ? (
              <div className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              {badge}
            </div>
          ) : null}

          <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-black text-zinc-500">
            {open ? <Eye size={14} /> : <EyeOff size={14} />}
          </div>
        </div>
      </button>

      {open ? (
        <div className="min-w-0 overflow-hidden p-3">
          {children}
        </div>
      ) : null}
    </section>
  )
}
