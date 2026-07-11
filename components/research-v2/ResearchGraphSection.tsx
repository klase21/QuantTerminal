import React from "react"
import { StatePanel } from "@/components/feedback"
import type { ResearchGraphViewModel } from "@/lib/research-presentation/contracts"

export function ResearchGraphSection({ model }: { readonly model: ResearchGraphViewModel }) { return <section aria-labelledby="research-graph-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Research Graph</p><h2 id="research-graph-title" className="mt-1 text-lg font-semibold">Supplied relationships only</h2></div><StatePanel state={model.lifecycle} title="Research Graph UNAVAILABLE" reason={model.reason} /></section> }
