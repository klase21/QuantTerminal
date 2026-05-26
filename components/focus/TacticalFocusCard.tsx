"use client"

import { ReactNode, useState } from "react"
import { Maximize2, X } from "lucide-react"

interface TacticalFocusCardProps {
  eyebrow?: string
  title: string
  summary?: string
  children: ReactNode
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
    <>
      <div
        className={`group relative overflow-hidden rounded-3xl border border-zinc-800 bg-black/50 p-4 transition duration-200 hover:border-cyan-300/35 hover:shadow-[0_0_34px_rgba(34,211,238,.10)] ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
          <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                {eyebrow}
              </div>
            ) : null}
            <div className="mt-1 text-base font-black text-white">{title}</div>
            {summary ? <div className="mt-1 text-xs text-zinc-500">{summary}</div> : null}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500 transition hover:border-cyan-300/40 hover:text-cyan-100"
            aria-label={`Focus ${title}`}
          >
            <Maximize2 size={14} />
          </button>
        </div>

        <div className="relative z-10">{children}</div>
      </div>

      {open ? (
        <div
          className="pointer-events-none fixed right-6 top-24 z-50 hidden w-[440px] rounded-[2rem] border border-cyan-300/30 bg-zinc-950/95 p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl xl:block"
          onMouseEnter={() => setOpen(true)}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {eyebrow ? (
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                  {eyebrow}
                </div>
              ) : null}
              <div className="mt-1 text-xl font-black text-white">{title}</div>
              {summary ? <div className="mt-1 text-xs text-zinc-500">{summary}</div> : null}
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <Maximize2 size={14} />
            </div>
          </div>

          <div className="max-h-[62vh] overflow-y-auto pr-1">
            {preview ?? children}
          </div>
        </div>
      ) : null}
    </>
  )
}
