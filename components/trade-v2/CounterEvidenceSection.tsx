import React from "react"
import { StatePanel } from "@/components/feedback"
import type { DecisionUnavailableViewModel } from "@/lib/trade-presentation/contracts"

export function CounterEvidenceSection({ model }: { readonly model: DecisionUnavailableViewModel }) { return <section aria-labelledby="counter-evidence-title" className="grid gap-4"><h2 id="counter-evidence-title" className="text-lg font-semibold">Counter Evidence</h2><StatePanel state={model.lifecycle} title="Counter Evidence UNAVAILABLE" reason={model.reason} /></section> }
