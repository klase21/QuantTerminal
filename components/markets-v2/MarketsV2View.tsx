import React from "react"
import type { MarketsV2ViewModel } from "@/lib/markets-presentation/contracts"
import { CapitalFlowSection } from "./CapitalFlowSection"
import { DerivativesIntelligenceSection } from "./DerivativesIntelligenceSection"
import { GlobalSummarySection } from "./GlobalSummarySection"
import { MacroEtfSection } from "./MacroEtfSection"
import { MarketsHandoffs } from "./MarketsHandoffs"
import { MarketsShell } from "./MarketsShell"
import { PredictionBreadthSection } from "./PredictionBreadthSection"
import { RepositoryAuditSection } from "./RepositoryAuditSection"
import { SectorRotationSection } from "./SectorRotationSection"

export interface MarketsV2Actions { readonly onSelectSymbol: (symbol: string) => void; readonly onOpenScanner: () => void }
export function MarketsV2View({ model, actions, realtimeDetail, embedded = false }: { readonly model: MarketsV2ViewModel; readonly actions: MarketsV2Actions; readonly realtimeDetail?: React.ReactNode; readonly embedded?: boolean }) { const Root = embedded ? "div" : "main"; return <Root data-qt-foundation="markets-v2" className="min-h-screen bg-[var(--qt-color-background)] px-3 py-4 text-[var(--qt-color-text-primary)] sm:px-5 lg:px-6"><div className="mx-auto grid max-w-[1800px] gap-8"><MarketsShell summary={model.summary} /><GlobalSummarySection model={model.summary} /><SectorRotationSection model={model.sectorRotation} /><CapitalFlowSection model={model.capitalFlow} /><DerivativesIntelligenceSection model={model.derivatives} realtimeDetail={realtimeDetail} /><MacroEtfSection macro={model.macro} etf={model.capitalFlow.etf} /><PredictionBreadthSection prediction={model.predictionMarkets} breadth={model.breadth} /><MarketsHandoffs movers={model.secondaryMovers} scanner={model.scannerHandoff} onSelectSymbol={actions.onSelectSymbol} onOpenScanner={actions.onOpenScanner} /><RepositoryAuditSection model={model.repository} /><footer className="border-t border-[var(--qt-color-border)] pt-4"><h2 className="text-sm font-semibold">Known limitations</h2><ul className="mt-2 grid gap-1 text-xs text-[var(--qt-color-text-muted)]">{model.pageLimitations.map((item) => <li key={item}>{item}</li>)}</ul></footer></div></Root> }
