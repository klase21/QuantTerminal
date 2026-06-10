import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export function ReplayInsightCard({
  icon: Icon,
  title,
  status,
  metric,
  description,
  tone = "neutral",
  children,
}: {
  icon?: LucideIcon
  title: string
  status?: ReactNode
  metric?: ReactNode
  description?: ReactNode
  tone?: "neutral" | "cyan" | "green" | "amber" | "rose"
  children?: ReactNode
}) {
  const toneClass = {
    neutral: "border-zinc-900 bg-black/45",
    cyan: "border-cyan-300/15 bg-cyan-400/10",
    green: "border-emerald-300/15 bg-emerald-400/10",
    amber: "border-amber-300/15 bg-amber-400/10",
    rose: "border-rose-300/15 bg-rose-400/10",
  }[tone]
  const iconClass = {
    neutral: "border-zinc-800 bg-black/35 text-zinc-300",
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
    green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-200",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-200",
  }[tone]

  return (
    <article className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {Icon ? (
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${iconClass}`}>
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            {status ? <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{status}</div> : null}
            <div className="mt-0.5 line-clamp-2 text-sm font-black leading-5 text-white">{title}</div>
          </div>
        </div>
        {metric ? <div className="shrink-0 text-right text-sm font-black text-cyan-100">{metric}</div> : null}
      </div>
      {description ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{description}</div> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </article>
  )
}

