"use client"

import { ReactNode, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface FocusModeShellProps {
  title: string
  description?: string
  children: ReactNode
}

export default function FocusModeShell({ title, description, children }: FocusModeShellProps) {
  const [focusMode, setFocusMode] = useState(false)

  return (
    <div className={focusMode ? "space-y-3" : "space-y-3"}>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-900 bg-black/40 px-4 py-3">
        <div>
          <div className="text-sm font-black text-white">{title}</div>
          {description ? <div className="mt-0.5 text-xs text-zinc-500">{description}</div> : null}
        </div>

        <button
          type="button"
          onClick={() => setFocusMode((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
            focusMode
              ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
              : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-cyan-100"
          }`}
        >
          {focusMode ? <EyeOff size={13} /> : <Eye size={13} />}
          {focusMode ? "Dense Mode" : "Focus Mode"}
        </button>
      </div>

      <div className={focusMode ? "grid gap-3 lg:grid-cols-1" : "grid gap-3 xl:grid-cols-2"}>
        {children}
      </div>
    </div>
  )
}
