"use client"

import { ReactNode, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

interface TacticalFocusCardProps {
  eyebrow?: string
  title: string
  summary?: string
  children?: ReactNode
  preview?: ReactNode
  className?: string
}

export default function TacticalFocusCard({
  eyebrow,
  title,
  summary,
  children,
  preview,
  className = "",
}: TacticalFocusCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-black/50 p-4 transition duration-200 hover:border-cyan-300/25 ${className}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-1 truncate text-base font-black text-white">{title}</div>
          {summary ? <div className="mt-1 truncate text-xs text-zinc-500">{summary}</div> : null}
        </div>

        {preview ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500 transition hover:border-cyan-300/40 hover:text-cyan-100"
            aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          >
            {open ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        ) : null}
      </div>

      {children ? <div className="relative z-10">{children}</div> : null}

      {open && preview ? (
        <div className="relative z-10 mt-3 max-h-[520px] overflow-y-auto rounded-2xl border border-cyan-300/20 bg-zinc-950/80 p-3">
          {preview}
        </div>
      ) : null}
    </div>
  )
}
