import React from "react"
import { StatePanel } from "@/components/feedback"
import type { DecisionUnavailableViewModel } from "@/lib/trade-presentation/contracts"

export function ScenarioAnalysisSection({ model }: { readonly model: DecisionUnavailableViewModel }) { return <section aria-labelledby="scenario-analysis-title" className="grid gap-4"><h2 id="scenario-analysis-title" className="text-lg font-semibold">Scenario Analysis</h2><StatePanel state={model.lifecycle} title="Scenario Analysis UNAVAILABLE" reason={model.reason} /></section> }
