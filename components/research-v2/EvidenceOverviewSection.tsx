import React from "react"
import { EvidenceCard } from "@/components/evidence"
import { StatePanel } from "@/components/feedback"
import type { EvidenceViewModel } from "@/lib/design-system"
import type { ResearchEvidenceViewModel } from "@/lib/research-presentation/contracts"

export function EvidenceOverviewSection({ evidence, secondaryContext }: { readonly evidence: readonly ResearchEvidenceViewModel[]; readonly secondaryContext: readonly EvidenceViewModel[] }) {
  return <section aria-labelledby="research-evidence-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Evidence Overview</p><h2 id="research-evidence-title" className="mt-1 text-lg font-semibold">Supplied observations and context</h2></div>{evidence.length ? <div className="grid gap-3 lg:grid-cols-2">{evidence.map((item) => <EvidenceCard key={item.evidenceId} evidence={item} variant="expanded" />)}</div> : <StatePanel state="EMPTY" title="Structured evidence" reason="Manual historical sources have not supplied structured supporting evidence." />}{secondaryContext.length ? <div><h3 className="mb-2 text-sm font-semibold">Secondary aggregate context</h3><div className="grid gap-3 lg:grid-cols-2">{secondaryContext.map((item) => <EvidenceCard key={item.id} evidence={item} />)}</div></div> : null}</section>
}
