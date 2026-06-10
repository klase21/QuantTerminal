"use client"

import { DatabaseZap } from "lucide-react"

import { AcceptedEventLinkerPanel } from "./AcceptedEventLinkerPanel"
import { ExternalEventAdapterPreviewPanel } from "./ExternalEventAdapterPreviewPanel"
import { ExternalEventReviewQueuePanel } from "./ExternalEventReviewQueuePanel"
import { HistoricalEventIngestionPanel } from "./HistoricalEventIngestionPanel"
import { HistoricalQueryExplorerPanel } from "./HistoricalQueryExplorerPanel"
import { HistoricalRecordInspectorPanel } from "./HistoricalRecordInspectorPanel"
import { HistoricalRelationshipGraphPanel } from "./HistoricalRelationshipGraphPanel"
import { HistoricalScoringPanel } from "./HistoricalScoringPanel"
import { HistoricalValidationPanel } from "./HistoricalValidationPanel"
import { PolymarketLiveValidationPanel } from "./PolymarketLiveValidationPanel"
import { ReplayDecisionWritePanel } from "./ReplayDecisionWritePanel"
import type { ReplayCase } from "@/core/replay/replayTypes"

export function DataOperationsWorkbenchPanel({
  replay,
  refreshSignal,
  onRefresh,
}: {
  replay: ReplayCase
  refreshSignal: number
  onRefresh: () => void
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <DatabaseZap className="h-3.5 w-3.5" />
          Data Operations Workbench
        </div>
        <div className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
          advanced / mock-first
        </div>
      </div>
      <p className="mb-3 text-xs leading-5 text-zinc-500">
        Source preview, validation, review, linking, scoring, inspection, writes, and ingestion live here so normal Replay review stays focused on forensics.
      </p>
      <div className="grid gap-3">
        <HistoricalQueryExplorerPanel assetHint={replay.symbol} />
        <ExternalEventAdapterPreviewPanel assetHint={replay.symbol} />
        <PolymarketLiveValidationPanel assetHint={replay.symbol} />
        <ExternalEventReviewQueuePanel assetHint={replay.symbol} onAccepted={onRefresh} />
        <AcceptedEventLinkerPanel onLinkAccepted={onRefresh} />
        <HistoricalRelationshipGraphPanel />
        <HistoricalScoringPanel />
        <HistoricalValidationPanel />
        <HistoricalRecordInspectorPanel refreshSignal={refreshSignal} />
        <ReplayDecisionWritePanel replay={replay} onWrite={onRefresh} />
        <HistoricalEventIngestionPanel replay={replay} onIngest={onRefresh} />
      </div>
    </section>
  )
}
