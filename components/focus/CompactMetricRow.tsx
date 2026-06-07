"use client"

interface CompactMetricRowProps {
  label: string
  value: string | number
  tone?: "green" | "red" | "yellow" | "cyan" | "purple" | "zinc"
}

const toneClass = {
  green: "text-emerald-300",
  red: "text-red-300",
  yellow: "text-yellow-300",
  cyan: "text-cyan-300",
  purple: "text-purple-300",
  zinc: "text-zinc-300",
}

export default function CompactMetricRow({ label, value, tone = "zinc" }: CompactMetricRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/60 px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-black ${toneClass[tone]}`}>{value}</span>
    </div>
  )
}
