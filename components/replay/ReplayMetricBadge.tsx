import type { ReactNode } from "react"

export function ReplayMetricBadge({
  label,
  tone = "neutral",
}: {
  label: ReactNode
  tone?: "neutral" | "cyan" | "green" | "amber" | "rose"
}) {
  const toneClass = {
    neutral: "border-zinc-700 bg-black/35 text-zinc-300",
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-100",
  }[tone]

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${toneClass}`}>
      {label}
    </span>
  )
}

