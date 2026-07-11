import React from "react"
import { Badge } from "@/components/ui/foundation"
import type { ResearchSummaryViewModel } from "@/lib/research-presentation/contracts"

export function ResearchShell({ summary }: { readonly summary: ResearchSummaryViewModel }) {
  return <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--qt-color-border)] pb-4">
    <div className="min-w-0"><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Research V2</p><h1 className="mt-1 break-words text-xl font-semibold">{summary.question.title}</h1><p className="mt-1 text-sm text-[var(--qt-color-text-secondary)]">{summary.question.symbol} / {summary.question.exchange} / {summary.question.timeframe}</p></div>
    <Badge tone="neutral">Evidence workspace</Badge>
  </header>
}
