import React from "react"
import { MetricCard } from "@/components/evidence"
import type { DecisionEvidenceViewModel } from "@/lib/trade-presentation/contracts"

export function SupportingEvidenceSection({ model }: { readonly model: DecisionEvidenceViewModel }) { return <section aria-labelledby="supporting-evidence-title" className="grid gap-4"><h2 id="supporting-evidence-title" className="text-lg font-semibold">Supporting Observations</h2>{model.observations.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{model.observations.map((item) => <MetricCard key={item.id} metric={item} />)}</div> : <p className="text-sm text-[var(--qt-color-text-muted)]">Structured observations are unavailable.</p>}</section> }
