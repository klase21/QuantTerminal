"use client"

import { useEffect, useState, type ReactNode } from "react"
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
import { InformationHistoricalBridgePanel } from "./InformationHistoricalBridgePanel"
import { InformationReviewQueuePanel } from "./InformationReviewQueuePanel"
import { PolymarketLiveValidationPanel } from "./PolymarketLiveValidationPanel"
import { ReplayDecisionWritePanel } from "./ReplayDecisionWritePanel"
import type { ReplayCase } from "@/core/replay/replayTypes"
import { replayStandardCaveats } from "@/design-system/replayPresentationRules"

type DataOpsTab = "search" | "review" | "bridge" | "adapter" | "validation" | "links" | "graph" | "records" | "write" | "ingest"

const DATA_OPS_TABS: { id: DataOpsTab; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "review", label: "Info Review" },
  { id: "bridge", label: "Bridge" },
  { id: "adapter", label: "Adapter" },
  { id: "validation", label: "Validation" },
  { id: "links", label: "Links" },
  { id: "graph", label: "Graph" },
  { id: "records", label: "Records" },
  { id: "write", label: "Write" },
  { id: "ingest", label: "Ingest" },
]

type DataOpsSummary = {
  pendingReviews: number | null
  acceptedLinks: number | null
  validationHealth: string
  status: "idle" | "loading" | "ready" | "partial"
}

type InfoReviewResponse = {
  ok: boolean
  data?: {
    pendingCount?: number
  }
}

type AcceptedLinksResponse = {
  ok: boolean
  data?: {
    count?: number
  }
}

type ValidationResponse = {
  ok: boolean
  data?: {
    summary?: {
      pipelineHealth?: string
    }
  }
}

function SummaryMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/35 px-2 py-1.5">
      <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</div>
      <div className="mt-1 text-xs font-black text-zinc-300">{value}</div>
    </div>
  )
}

export function DataOperationsWorkbenchPanel({
  replay,
  refreshSignal,
  onRefresh,
}: {
  replay: ReplayCase
  refreshSignal: number
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DataOpsTab>("search")
  const [summary, setSummary] = useState<DataOpsSummary>({
    pendingReviews: null,
    acceptedLinks: null,
    validationHealth: "unknown",
    status: "idle",
  })

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setSummary((current) => ({ ...current, status: "loading" }))
      try {
        const [reviewsResponse, linksResponse, validationResponse] = await Promise.all([
          fetch("/api/information-intelligence/review/items?status=pending&limit=1", { cache: "no-store" }),
          fetch("/api/historical-intelligence/accepted-event-links/list?limit=1", { cache: "no-store" }),
          fetch("/api/historical-intelligence/validation", { cache: "no-store" }),
        ])
        const [reviews, links, validation] = await Promise.all([
          reviewsResponse.json() as Promise<InfoReviewResponse>,
          linksResponse.json() as Promise<AcceptedLinksResponse>,
          validationResponse.json() as Promise<ValidationResponse>,
        ])
        if (cancelled) return
        setSummary({
          pendingReviews: reviews.ok ? reviews.data?.pendingCount ?? 0 : null,
          acceptedLinks: links.ok ? links.data?.count ?? 0 : null,
          validationHealth: validation.ok ? validation.data?.summary?.pipelineHealth ?? "unknown" : "unknown",
          status: reviews.ok && links.ok && validation.ok ? "ready" : "partial",
        })
      } catch {
        if (!cancelled) {
          setSummary({
            pendingReviews: null,
            acceptedLinks: null,
            validationHealth: "unknown",
            status: "partial",
          })
        }
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [refreshSignal])

  return (
    <section className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
              <DatabaseZap className="h-3.5 w-3.5" />
              Data Ops
            </div>
            <div className="rounded-full border border-amber-300/15 bg-amber-400/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/70">
              advanced-only
            </div>
            <div className="rounded-full border border-zinc-800 bg-black/35 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">
              {summary.status}
            </div>
          </div>
          <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-zinc-600">
            {replayStandardCaveats.advancedOps}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(4,minmax(90px,1fr))] lg:min-w-[470px]">
          <SummaryMetric label="Pending" value={summary.pendingReviews ?? "--"} />
          <SummaryMetric label="Links" value={summary.acceptedLinks ?? "--"} />
          <SummaryMetric label="Health" value={summary.validationHealth} />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg border border-zinc-800 bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
          >
            {open ? "Close" : "Open"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 rounded-xl border border-zinc-900 bg-black/25 p-3">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {DATA_OPS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                  activeTab === tab.id
                    ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                    : "border-zinc-800 bg-black/35 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-0">
            {activeTab === "search" ? <HistoricalQueryExplorerPanel assetHint={replay.symbol} /> : null}
            {activeTab === "review" ? <InformationReviewQueuePanel symbol={replay.symbol} /> : null}
            {activeTab === "bridge" ? <InformationHistoricalBridgePanel /> : null}
            {activeTab === "adapter" ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <ExternalEventAdapterPreviewPanel assetHint={replay.symbol} />
                <ExternalEventReviewQueuePanel assetHint={replay.symbol} onAccepted={onRefresh} />
              </div>
            ) : null}
            {activeTab === "validation" ? (
              <div className="grid gap-3 xl:grid-cols-3">
                <PolymarketLiveValidationPanel assetHint={replay.symbol} />
                <HistoricalValidationPanel />
                <HistoricalScoringPanel />
              </div>
            ) : null}
            {activeTab === "links" ? <AcceptedEventLinkerPanel onLinkAccepted={onRefresh} /> : null}
            {activeTab === "graph" ? <HistoricalRelationshipGraphPanel /> : null}
            {activeTab === "records" ? <HistoricalRecordInspectorPanel refreshSignal={refreshSignal} /> : null}
            {activeTab === "write" ? <ReplayDecisionWritePanel replay={replay} onWrite={onRefresh} /> : null}
            {activeTab === "ingest" ? <HistoricalEventIngestionPanel replay={replay} onIngest={onRefresh} /> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
