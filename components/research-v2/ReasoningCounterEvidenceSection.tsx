import React from "react"
import { CounterEvidenceCard } from "@/components/evidence"
import { StatePanel } from "@/components/feedback"
import type { CounterEvidenceViewModel } from "@/lib/design-system"
import type { ResearchReasoningViewModel } from "@/lib/research-presentation/contracts"

export function ReasoningCounterEvidenceSection({ reasoning, counterEvidence }: { readonly reasoning: ResearchReasoningViewModel; readonly counterEvidence: readonly CounterEvidenceViewModel[] }) {
  return <section aria-labelledby="reasoning-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-reasoning)]">Reasoning</p><h2 id="reasoning-title" className="mt-1 text-lg font-semibold">Cited interpretation boundary</h2></div><StatePanel state={reasoning.lifecycle} title="Reasoning UNAVAILABLE" reason={reasoning.reason} /><div><h3 className="mb-2 text-sm font-semibold">Counter Evidence</h3>{counterEvidence.length ? <div className="grid gap-3 lg:grid-cols-2">{counterEvidence.map((item) => <CounterEvidenceCard key={item.id} counterEvidence={item} />)}</div> : <StatePanel state="EMPTY" title="Counter Evidence unavailable" reason="No structured conflicting evidence has been supplied. Absence is not inferred." />}</div></section>
}
