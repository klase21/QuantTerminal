"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSearch,
  History,
  Radio,
  ShieldCheck,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import { StatePanel } from "@/components/feedback/state-panel"
import { Badge } from "@/components/ui/foundation/badge"
import useMarketSocket from "@/hooks/useMarketSocket"
import {
  formatCompactCount,
  formatConfidencePrimary,
  formatCoverageSemantic,
  formatCounterEvidenceStrength,
  formatDirectionalFlow,
  formatFundingRate,
  formatPlainNumber,
  formatPrice,
  formatSignedOpenInterestChange,
  formatSignedReturn,
} from "@/lib/presentation/financialFormatting"
import { humanReasonFor } from "@/lib/presentation/reasonDictionary"
import { useMarketStore } from "@/stores/useMarketStore"

export type MvpView = "dashboard" | "markets" | "scanner" | "trade" | "replay" | "research"
type RecordValue = Record<string, unknown>
type ProjectionResponse = { status?: string; reason?: string; projections?: unknown; data?: RecordValue; payload?: RecordValue; [key: string]: unknown }

const Legacy = {
  dashboard: dynamic(() => import("@/components/DashboardLayout")),
  markets: dynamic(() => import("@/components/markets/MarketsPage")),
  scanner: dynamic(() => import("@/components/scanner/ScannerPage")),
  trade: dynamic(() => import("@/components/trade/TradePage")),
  replay: dynamic(() => import("@/components/replay/ReplayV1Page")),
  research: dynamic(() => import("@/components/research/ResearchPage")),
}

const instruments = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
const labels: Record<MvpView, string> = { dashboard: "Dashboard", markets: "Markets", scanner: "Scanner", trade: "Trade", replay: "Replay", research: "Research" }
const routes: Record<MvpView, string> = { dashboard: "/dashboard", markets: "/markets", scanner: "/scanner", trade: "/trade", replay: "/replay", research: "/research" }
const preservedKeys = ["instrument", "symbol", "start", "end", "candidate", "candidateId", "evidence", "evidenceId", "projection", "projectionId"]

function asRecord(input: unknown): RecordValue { return input && typeof input === "object" && !Array.isArray(input) ? input as RecordValue : {} }
function asList(input: unknown): unknown[] { return Array.isArray(input) ? input : [] }
function text(input: unknown, fallback = "UNAVAILABLE") { return typeof input === "string" || typeof input === "number" || typeof input === "boolean" ? String(input) : fallback }
function value(payload: RecordValue, key: string, fallback = "UNAVAILABLE") { return text(payload[key], fallback) }
function codes(input: unknown): string[] {
  if (typeof input === "string") return input.split(/[|\s]+/).map((item) => item.trim()).filter(Boolean)
  return asList(input).map((item) => text(item, "")).filter(Boolean)
}
function label(input: string) { return input.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase()) }
function formatTimestamp(input: unknown) {
  const candidate = text(input, "")
  const parsed = Date.parse(candidate)
  return Number.isFinite(parsed) ? `${new Date(parsed).toISOString().replace(".000Z", "Z")} UTC` : "UNAVAILABLE"
}
function numeric(input: unknown): number | null {
  const parsed = typeof input === "number" ? input : Number(input)
  return Number.isFinite(parsed) ? parsed : null
}
function formatMetric(key: string, input: unknown): string {
  const parsed = numeric(input)
  const normalizedKey = key.toLowerCase()
  if (normalizedKey.includes("funding") || normalizedKey === "rate") return formatFundingRate(parsed)
  if (normalizedKey.includes("imbalance")) return formatDirectionalFlow(parsed)
  if (normalizedKey.includes("return") || normalizedKey.includes("pricechange") || normalizedKey === "boundedpricechangepct") return formatSignedReturn(parsed)
  if (normalizedKey.includes("oichange") || normalizedKey === "changepct") return formatSignedOpenInterestChange(parsed)
  if (normalizedKey.includes("tradecount") || normalizedKey === "eventcount") return formatCompactCount(parsed)
  if (normalizedKey === "close" || normalizedKey.includes("price")) return formatPrice(parsed)
  if (parsed !== null) return formatPlainNumber(parsed)
  return text(input)
}
function parseProviderRecord(input: unknown): RecordValue {
  if (typeof input !== "string" || !input.startsWith("@{")) return asRecord(input)
  return Object.fromEntries(input.slice(2, -1).split(";").map((part) => part.trim().split("=")).filter((entry) => entry.length === 2))
}
function stateTone(input: unknown): "neutral" | "info" | "success" | "warning" | "danger" | "experimental" {
  const state = text(input, "").toUpperCase()
  if (state.includes("AVAILABLE") || state.includes("COMPLETE") || state === "CURRENT") return "success"
  if (state.includes("BLOCK") || state.includes("ERROR") || state.includes("CONFLICT") || state.includes("GAP")) return "danger"
  if (state.includes("STALE") || state.includes("PENDING") || state.includes("LIMIT") || state === "LOW") return "warning"
  if (state.includes("EXPERIMENTAL") || state.includes("LOWER_BOUND")) return "experimental"
  if (state.includes("NEUTRAL") || state.includes("NOT_APPLICABLE")) return "neutral"
  return "info"
}

const surface = "min-w-0 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)]"
const sectionTitle = "text-[var(--qt-type-caption-size)] font-bold uppercase text-[var(--qt-color-text-secondary)]"

function Section({ title, icon, children, className = "", aside }: { title: string; icon?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return <section className={`${surface} ${className}`}><header className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--qt-color-border)] px-4 py-2"><h2 className={`${sectionTitle} flex items-center gap-2`}>{icon}{title}</h2>{aside}</header><div className="min-w-0 p-4">{children}</div></section>
}

function ReasonList({ values, empty = "No governed observations were supplied." }: { values: unknown; empty?: string }) {
  const items = codes(values)
  return items.length ? <ul className="grid gap-3 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-primary)]">{items.map((item) => { const reason = humanReasonFor(item), repeated = reason.label.replace(/[.\s]/g, "").toLowerCase() === reason.explanation.replace(/[.\s]/g, "").toLowerCase(); return <li className="flex min-w-0 items-start gap-2" key={item}><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" /><span className="min-w-0 break-words"><strong className="block font-semibold">{reason.label}</strong>{!repeated ? <span className="mt-0.5 block text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">{reason.explanation}</span> : null}{reason.code === "UNMAPPED_REASON_CODE" ? <code className="mt-1 block text-[10px] text-[var(--qt-color-warning)]">{reason.technicalCode}</code> : null}</span></li> })}</ul> : <p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-muted)]">{empty}</p>
}

function InvalidationList({ values }: { values: unknown }) {
  const items = asList(values).map(asRecord)
  return items.length ? <ul className="grid gap-3">{items.map((item, index) => { const condition = humanReasonFor(value(item, "observableStateChange")), level = humanReasonFor(value(item, "valueStatus")); return <li className="border-l-2 border-[var(--qt-color-warning)] pl-3" key={index}><strong className="text-sm">{condition.label}</strong><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">{condition.explanation}</p><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">{level.label}</p></li> })}</ul> : <DataStateNotice state="NOT_APPLICABLE" source="Trade context" affectsConclusion={false} detail="No observable invalidation condition was supplied." />
}

function MetricRows({ data, compact = false }: { data: unknown; compact?: boolean }) {
  const items = asList(data)
  if (items.length) return <div className="grid gap-3">{items.map((item, index) => <div className="min-w-0 rounded-[var(--qt-radius-control)] border-l-2 border-[var(--qt-color-border-strong)] pl-3" key={index}>{Object.keys(asRecord(item)).length ? <MetricRows data={item} compact /> : <p className="break-words text-[var(--qt-type-body-size)] text-[var(--qt-color-text-primary)]">{text(item)}</p>}</div>)}</div>
  const fields = asRecord(data)
  if (!Object.keys(fields).length) return <p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-muted)]">{text(data)}</p>
  return <dl className="grid min-w-0 gap-2">{Object.entries(fields).map(([key, item]) => {
    const nested = asRecord(item)
    return <div className={`min-w-0 ${compact ? "grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1.3fr)] gap-3" : "grid gap-1 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] sm:gap-4"}`} key={key}><dt className="text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-muted)]">{label(key)}</dt><dd className="min-w-0 break-words text-[var(--qt-type-body-size)] text-[var(--qt-color-text-primary)]">{Object.keys(nested).length ? <MetricRows compact data={nested} /> : formatMetric(key, item)}</dd></div>
  })}</dl>
}

function DataStateNotice({ state, source, asOf, affectsConclusion, detail }: { state: string; source?: string; asOf?: unknown; affectsConclusion: boolean; detail: string }) {
  return <div className="grid gap-2 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] p-3" role="status"><div className="flex flex-wrap items-center gap-2"><Badge tone={stateTone(state)}>{label(state)}</Badge>{source ? <span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">Source: {source}</span> : null}{asOf ? <span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">As of {formatTimestamp(asOf)}</span> : null}</div><p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">{detail}</p><p className="text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-muted)]">{affectsConclusion ? "This limitation affects the governed conclusion." : "The primary governed conclusion remains available."}</p></div>
}

export function MvpCutoverLoadingShell({ view }: { view: MvpView }) {
  return <main data-qt-foundation="mvp-cutover" className="min-h-screen overflow-x-hidden bg-[var(--qt-color-background)] px-3 py-4 text-white"><div className="mx-auto max-w-[1600px]"><StatePanel state="LOADING" title={`Loading ${labels[view]}`} reason="Reading the bounded governed Projection. Optional sections will not block the primary result." /></div></main>
}

function Status({ kind, reason }: { kind: "READ ERROR" | "MISSING" | "BLOCKED" | "UNAVAILABLE"; reason?: string }) {
  const state = kind === "READ ERROR" ? "ERROR" : kind === "MISSING" ? "EMPTY" : "PARTIAL"
  return <main data-qt-foundation="mvp-cutover" className="min-h-screen overflow-x-hidden bg-[var(--qt-color-background)] px-3 py-4 text-white"><div className="mx-auto max-w-[1600px]"><StatePanel state={state} title={kind} reason={reason || "The governed Projection is unavailable. No legacy or fabricated value was substituted."} /></div></main>
}

function LiveOverlay({ instrument, referenceValue, projectionAsOf }: { instrument: string; referenceValue: unknown; projectionAsOf: unknown }) {
  useMarketSocket()
  const ticker = useMarketStore((state) => state.tickers[instrument])
  const observedAt = ticker?.timestamp ? new Date(ticker.timestamp).toISOString() : null
  const freshness = ticker?.timestamp && Date.now() - ticker.timestamp < 30_000 ? "CURRENT" : ticker ? "STALE" : "SOURCE_UNAVAILABLE"
  return <section aria-labelledby="live-overlay-title" className={`${surface} grid gap-3 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center`}><div><p id="live-overlay-title" className={`${sectionTitle} flex items-center gap-2 text-[var(--qt-color-evidence)]`}><Database className="h-4 w-4" />Governed reference</p><p className="mt-1 text-lg font-semibold text-[var(--qt-color-text-primary)]">{formatPrice(numeric(referenceValue))}</p><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">Projection as of {formatTimestamp(projectionAsOf)}</p></div><div className="border-[var(--qt-color-border)] lg:border-l lg:pl-4"><p className={`${sectionTitle} flex items-center gap-2 text-[var(--qt-color-warning)]`}><Radio className="h-4 w-4" />Live Binance overlay</p><p className="mt-1 text-lg font-semibold text-[var(--qt-color-text-primary)]">{ticker ? `${ticker.symbol} ${formatPrice(numeric(ticker.price))}` : "UNAVAILABLE"}</p><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">Observed {observedAt ? formatTimestamp(observedAt) : "UNAVAILABLE"}</p></div><div className="lg:max-w-64"><Badge tone={stateTone(freshness)}>{freshness}</Badge><p className="mt-2 text-[var(--qt-type-caption-size)] leading-relaxed text-[var(--qt-color-text-secondary)]">A newer quote does not recompute or replace governed Evidence.</p></div></section>
}

function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--qt-radius-control)] px-2 text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-repository)] hover:bg-[var(--qt-color-surface-emphasis)]" href={href}>{children}<ArrowRight className="h-3.5 w-3.5" /></Link>
}

function Dashboard({ payload, projections, href }: { payload: RecordValue; projections: unknown[]; href: (view: MvpView, extra?: Record<string, string>) => string }) {
  const states = asList(payload.instrumentStates)
  const stateCounts = asRecord(payload.stateCounts)
  const macroProjection = projections.map(asRecord).find((item) => item.projectionKind === "MacroContextProjection")
  const macro = asRecord(macroProjection?.payload)
  const rates = asRecord(macro.ratesContext)
  const equity = asRecord(macro.equityRiskContext)
  const etfProjection = projections.map(asRecord).find((item) => item.projectionKind === "BitcoinEtfFlowProjection")
  return <div className="grid gap-4"><section className={`${surface} p-5`}><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div><p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>Market state</p><h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[var(--qt-color-text-primary)]">Mixed positioning across the six-instrument universe</h2><p className="mt-2 max-w-2xl text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">State counts remain separate. QuantTerminal does not convert mixed categorical evidence into a directional score.</p></div><div className="flex flex-wrap gap-2">{Object.entries(stateCounts).map(([key, count]) => <Badge key={key} tone={stateTone(key)}>{text(count)} {label(key)}</Badge>)}</div></div></section><div className="grid gap-4 lg:grid-cols-2"><Section title="Primary drivers" icon={<Activity className="h-4 w-4 text-[var(--qt-color-evidence)]" />}><ReasonList values={payload.primaryDrivers} /></Section><Section title="Primary risks and counter evidence" icon={<AlertTriangle className="h-4 w-4 text-[var(--qt-color-counter-evidence)]" />}><ReasonList values={payload.primaryRisks} /></Section></div><Section title="Investigation universe" icon={<ShieldCheck className="h-4 w-4 text-[var(--qt-color-success)]" />}><div className="divide-y divide-[var(--qt-color-border)]">{states.map((item, index) => { const row = asRecord(item), instrument = value(row, "instrument", String(index)), evidence = value(row, "evidencePacketId", ""); return <article className="grid min-w-0 gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-center" key={`${instrument}-${index}`}><strong className="text-sm text-[var(--qt-color-text-primary)]">{instrument}</strong><div className="flex flex-wrap items-center gap-2"><Badge tone={stateTone(row.state)}>{label(value(row, "state"))}</Badge><span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">{formatConfidencePrimary(row.confidence)}</span></div><div className="flex flex-wrap gap-1"><PageLink href={href("markets", { instrument })}>Markets</PageLink><PageLink href={href("research", { instrument, evidence })}>Evidence</PageLink><PageLink href={href("replay", { instrument })}>Replay</PageLink></div></article> })}</div></Section><Section title="External context" icon={<Database className="h-4 w-4 text-[var(--qt-color-repository)]" />}><div className="grid gap-3 md:grid-cols-2">{macroProjection ? <article className="border-l-2 border-[var(--qt-color-evidence)] pl-4"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">Macro and risk context</strong><Badge tone="warning">{label(value(macro, "classification", "MIXED"))}</Badge></div><p className="mt-2 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">US 10-year yield {formatSignedReturn(numeric(rates.value))}; SPY five-day move {formatSignedReturn(numeric(equity.fiveTradingDayReturnPct))}. Daily supplemental observations do not recompute the crypto conclusion.</p><p className="mt-2 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">Observed through {formatTimestamp(macroProjection.eventTimeEnd)} · FRED official macro and Alpha Vantage daily market context</p></article> : <DataStateNotice state="PROJECTION_MISSING" source="FRED and Alpha Vantage" affectsConclusion={false} detail="Supplemental macro context is unavailable. Core crypto Evidence remains functional." />}{etfProjection ? <MetricRows data={etfProjection.payload} compact /> : <DataStateNotice state="SOURCE_BLOCKED" source="Farside Bitcoin ETF Flow" affectsConclusion={false} detail="The public page is readable, but server-side Raw Artifact retrieval is rejected with HTTP 403. No ETF flow value is substituted." />}</div></Section></div>
}

function Markets({ projections, href }: { projections: unknown[]; href: (view: MvpView, extra?: Record<string, string>) => string }) {
  const summaries = projections.map(asRecord).filter((item) => item.projectionKind === "InstrumentMarketSummaryProjection")
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{summaries.map((projection) => { const payload = asRecord(projection.payload), instrument = value(projection, "subjectId"), evidence = value(payload, "evidencePacketId", ""), price = asRecord(payload.latestGovernedPrice), oi = asRecord(payload.openInterest), funding = asRecord(payload.funding), flow = asRecord(payload.aggressiveFlow), confidence = asRecord(payload.confidence); return <article key={value(projection, "projectionVersionId")} className={`${surface} flex min-w-0 flex-col`}><header className="flex items-start justify-between gap-3 border-b border-[var(--qt-color-border)] p-4"><div><h2 className="text-base font-bold text-[var(--qt-color-text-primary)]">{instrument}</h2><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">As of {formatTimestamp(projection.eventTimeEnd)}</p></div><Badge tone={stateTone(payload.marketState)}>{label(value(payload, "marketState"))}</Badge></header><div className="grid flex-1 gap-4 p-4"><div><p className="text-2xl font-semibold text-[var(--qt-color-text-primary)]">{formatPrice(numeric(price.close))}</p><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">Projection reference <span className="font-semibold">{formatSignedReturn(numeric(price.boundedPriceChangePct))}</span></p></div><dl className="grid grid-cols-3 gap-2"><div><dt className={sectionTitle}>OI change</dt><dd className="mt-1 text-sm font-semibold">{formatSignedOpenInterestChange(numeric(oi.changePct))}</dd></div><div><dt className={sectionTitle}>Funding</dt><dd className="mt-1 text-sm font-semibold">{formatFundingRate(numeric(funding.latestProviderEventRate))}</dd></div><div><dt className={sectionTitle}>Flow</dt><dd className="mt-1 text-sm font-semibold">{formatDirectionalFlow(numeric(flow.imbalanceRatio))}</dd></div></dl><div className="flex flex-wrap gap-2"><Badge tone={stateTone(confidence.classification)}>{formatConfidencePrimary(confidence.classification)}</Badge></div></div><footer className="flex flex-wrap gap-1 border-t border-[var(--qt-color-border)] px-2 py-1"><PageLink href={href("research", { instrument, evidence })}>Evidence</PageLink><PageLink href={href("replay", { instrument, start: value(projection, "eventTimeStart"), end: value(projection, "eventTimeEnd") })}>Replay</PageLink><PageLink href={href("scanner", { instrument })}>Scanner</PageLink></footer></article> })}</div>
}

function Scanner({ payload, href }: { payload: RecordValue; href: (view: MvpView, extra?: Record<string, string>) => string }) {
  const candidates = asList(payload.candidates)
  return <div className="grid gap-4"><DataStateNotice state="AVAILABLE" source="Governed ScannerCandidateProjection" asOf={payload.eventTimeEnd} affectsConclusion={false} detail="Rank is investigation priority under comparable Coverage. It is not expected profitability or a trade recommendation." /><Section title="Investigation queue" icon={<FileSearch className="h-4 w-4 text-[var(--qt-color-evidence)]" />}><ol className="divide-y divide-[var(--qt-color-border)]">{candidates.length ? candidates.map((item, index) => { const candidateRow = asRecord(item), candidate = value(candidateRow, "candidateId", ""), instrument = value(candidateRow, "instrument", ""); return <li className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[3rem_9rem_minmax(0,1fr)_auto] md:items-center" key={candidate || index}><span className="text-2xl font-semibold text-[var(--qt-color-text-muted)]">{value(candidateRow, "rank")}</span><div><strong className="text-sm text-[var(--qt-color-text-primary)]">{instrument}</strong><div className="mt-2"><Badge tone={stateTone(candidateRow.assessmentState)}>{label(value(candidateRow, "assessmentState"))}</Badge></div></div><div className="min-w-0"><p className="text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-secondary)]">{codes(candidateRow.ruleReasonCodes).map((code) => humanReasonFor(code).label).join(" · ") || "No trigger reason; retained for universe completeness"}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]"><span>{formatConfidencePrimary(candidateRow.evidenceStrength)}</span><span>Counter evidence: {formatCounterEvidenceStrength(numeric(candidateRow.counterEvidenceStrength))}</span><span>Coverage: {candidateRow.coverageComparable === true ? "Comparable" : "Not comparable"}</span><span>Freshness: {label(value(candidateRow, "freshness"))}</span></div></div><div className="flex flex-wrap gap-1"><PageLink href={href("trade", { candidate, instrument, evidence: value(candidateRow, "evidencePacketId", "") })}>Decision context</PageLink><PageLink href={href("research", { instrument, evidence: value(candidateRow, "evidencePacketId", "") })}>Evidence</PageLink></div></li> }) : <li><DataStateNotice state="NOT_APPLICABLE" source="ScannerCandidateProjection" affectsConclusion={false} detail="No comparable candidates qualified for this governed window." /></li>}</ol></Section></div>
}

function Trade({ payload, href }: { payload: RecordValue; href: (view: MvpView, extra?: Record<string, string>) => string }) {
  const instrument = value(payload, "selectedInstrument"), window = asList(payload.relatedReplayWindow).map(String)
  return <div className="grid gap-4"><section className={`${surface} p-5`}><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>Decision context · no execution</p><h2 className="mt-2 text-2xl font-semibold">{instrument} · {label(value(payload, "marketState"))}</h2><p className="mt-2 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">This workspace organizes evidence and observable invalidation. It creates no order, size, entry, or exit instruction.</p></div><Badge tone="warning">{label(value(payload, "actionState", "CONTEXT_ONLY_NO_ACTION"))}</Badge></div></section><div className="grid gap-4 lg:grid-cols-2"><Section title="Supporting facts" icon={<CheckCircle2 className="h-4 w-4 text-[var(--qt-color-success)]" />}><ReasonList values={payload.supportingFacts} /></Section><Section title="Counter evidence and risks" icon={<AlertTriangle className="h-4 w-4 text-[var(--qt-color-counter-evidence)]" />}><ReasonList values={payload.counterEvidence} /></Section><Section title="Observable invalidation"><InvalidationList values={payload.invalidationConditions} /></Section><Section title="Evidence strength"><MetricRows data={payload.confidence} /></Section><Section title="Coverage and limitations"><MetricRows data={payload.coverage} /><div className="mt-4 border-t border-[var(--qt-color-border)] pt-4"><ReasonList values={payload.sourceLimitations} /></div></Section></div><section className={`${surface} flex flex-wrap items-center gap-2 px-2 py-1`}><PageLink href={href("research", { instrument, evidence: codes(payload.evidencePacketIds)[0] ?? "" })}>Open supporting Evidence</PageLink><PageLink href={href("replay", { instrument, start: window[0] ?? "", end: window[1] ?? "" })}>Review related Replay</PageLink></section></div>
}

function Replay({ payload, cursor, onCursor, href, instrument }: { payload: RecordValue; cursor: number; onCursor: (next: number) => void; href: (view: MvpView, extra?: Record<string, string>) => string; instrument: string }) {
  const lanes = asRecord(payload.lanes), funding = asList(lanes.fundingEvents).map(parseProviderRecord), markers = asList(lanes.evidenceMarkers).map(parseProviderRecord), unavailable = codes(payload.unavailableLanes)
  return <div className="grid gap-4"><Section title="Timeline controls" icon={<History className="h-4 w-4 text-[var(--qt-color-evidence)]" />} aside={<Badge tone="info">Bounded daily window</Badge>}><label className="grid gap-3" htmlFor="replay-cursor"><span className="flex items-center justify-between text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]"><span>Synchronized event cursor</span><strong>{cursor}%</strong></span><input id="replay-cursor" className="min-h-11 w-full accent-[var(--qt-color-focus)]" type="range" min="0" max="100" value={cursor} onChange={(event) => onCursor(Number(event.target.value))} /></label></Section><div className="grid gap-4 lg:grid-cols-2"><Section title="Price movement"><MetricRows data={lanes.ohlcv} /></Section><Section title="Open interest"><MetricRows data={lanes.openInterest} /></Section><Section title="Funding events" aside={<Badge tone="info">Provider native</Badge>}>{funding.length ? <div className="grid gap-3">{funding.map((event, index) => <article className="border-l-2 border-[var(--qt-color-evidence)] pl-3" key={index}><p className="text-sm font-semibold">Rate {formatFundingRate(numeric(event.rate))}</p><p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">{label(value(event, "eventClass"))}</p></article>)}</div> : <DataStateNotice state="NOT_APPLICABLE" source="Funding" affectsConclusion={false} detail="No provider-native Funding event occurred inside this window." />}<p className="mt-4 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">Markers remain discrete. No five-minute interpolation is created.</p></Section><Section title="Aggressive trade aggregate" aside={<Badge tone="success">Segment derived</Badge>}><MetricRows data={lanes.aggTradesSummary} /></Section><Section title="Evidence markers">{markers.length ? <div className="grid gap-3">{markers.map((marker, index) => <article className="flex min-w-0 flex-wrap items-center justify-between gap-2" key={index}><Badge tone={stateTone(marker.state)}>{label(value(marker, "state"))}</Badge><PageLink href={href("research", { instrument, evidence: value(marker, "packetId", "") })}>Inspect Evidence</PageLink></article>)}</div> : <p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-muted)]">No Evidence marker in this window.</p>}</Section><Section title="Optional enrichment"><div className="grid gap-3">{unavailable.map((lane) => <DataStateNotice key={lane} state={lane === "LIQUIDATION" ? "SOURCE_BLOCKED" : "SOURCE_UNAVAILABLE"} source={label(lane)} affectsConclusion={false} detail={`${label(lane)} is not available in this bounded Replay Projection. The primary price, OI, Funding, AggTrades, and Evidence lanes remain usable.`} />)}</div></Section></div></div>
}

function Research({ payload, projections }: { payload: RecordValue; projections: unknown[] }) {
  const macroProjection = projections.map(asRecord).find((item) => item.projectionKind === "MacroContextProjection")
  const macro = asRecord(macroProjection?.payload)
  const facts = asRecord(payload.verifiedFacts)
  const confidence = asRecord(payload.confidence)
  const coverage = asRecord(payload.coverage)
  const minimumCoverage = Math.min(...Object.values(coverage).map(numeric).filter((item): item is number => item !== null))
  return <div className="grid gap-4">
    <section className={`${surface} p-5`}><p className={`${sectionTitle} text-[var(--qt-color-reasoning)]`}>Governed conclusion</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{label(value(payload, "conclusion"))}</h2><Badge tone={stateTone(confidence.classification)}>{formatConfidencePrimary(confidence.classification)}</Badge></div><p className="mt-3 max-w-3xl text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">Evidence strength describes agreement, Coverage, alignment, and counter evidence under governed rules. It is not a probability of future price direction.</p></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Verified facts" icon={<Database className="h-4 w-4 text-[var(--qt-color-success)]" />}><dl className="grid grid-cols-2 gap-4"><div><dt className={sectionTitle}>Price move</dt><dd className="mt-1 font-semibold">{formatSignedReturn(numeric(facts.priceReturnPct))}</dd></div><div><dt className={sectionTitle}>Open interest</dt><dd className="mt-1 font-semibold">{formatSignedOpenInterestChange(numeric(facts.oiChangePct))}</dd></div><div><dt className={sectionTitle}>Funding</dt><dd className="mt-1 font-semibold">{formatFundingRate(numeric(facts.fundingLatestRate))}</dd></div><div><dt className={sectionTitle}>Aggressive flow</dt><dd className="mt-1 font-semibold">{formatDirectionalFlow(numeric(facts.aggressiveImbalanceRatio))}</dd></div><div><dt className={sectionTitle}>Trade count</dt><dd className="mt-1 font-semibold">{formatCompactCount(numeric(facts.tradeCount), "trades")}</dd></div><div><dt className={sectionTitle}>Realized range</dt><dd className="mt-1 font-semibold">{formatSignedReturn(numeric(facts.realizedRangePct))}</dd></div></dl></Section>
      <Section title="Interpretation" icon={<Activity className="h-4 w-4 text-[var(--qt-color-reasoning)]" />}><p className="text-lg font-semibold">{label(value(payload, "conclusion"))}</p><p className="mt-2 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">The governed rules classify this window from the verified facts shown here. Supporting and opposing observations remain separate below.</p></Section>
      <Section title="Supporting evidence" icon={<CheckCircle2 className="h-4 w-4 text-[var(--qt-color-success)]" />}><ReasonList values={payload.supportingEvidence} /></Section>
      <Section title="Counter evidence" icon={<AlertTriangle className="h-4 w-4 text-[var(--qt-color-counter-evidence)]" />}><ReasonList values={payload.counterEvidence} /></Section>
      <Section title="Evidence strength"><Badge tone={stateTone(confidence.classification)}>{formatConfidencePrimary(confidence.classification)}</Badge><dl className="mt-4 grid gap-2">{Object.entries(asRecord(confidence.components)).map(([key, item]) => <div className="flex items-center justify-between gap-3" key={key}><dt className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">{label(key)}</dt><dd className="text-sm font-semibold">{formatCounterEvidenceStrength(numeric(item))}</dd></div>)}</dl></Section>
      <Section title="Coverage"><p className="text-lg font-semibold">{formatCoverageSemantic(!Number.isFinite(minimumCoverage) ? "UNAVAILABLE" : minimumCoverage >= 0.95 ? "COMPLETE" : minimumCoverage > 0 ? "PARTIAL" : "GAP")}</p><p className="mt-2 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">Minimum aligned Coverage across required datasets.</p></Section>
    </div>
    <Section title="Supplemental external context" icon={<Database className="h-4 w-4 text-[var(--qt-color-repository)]" />}>{macroProjection ? <div><div className="flex flex-wrap items-center gap-2"><Badge tone="warning">{label(value(macro, "classification", "MIXED"))}</Badge><span className="text-sm text-[var(--qt-color-text-secondary)]">Daily context · {label(value(macro, "cryptoAssessmentRelationship"))}</span></div><p className="mt-3 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">This FRED and Alpha Vantage context is supplemental. It neither changes nor supersedes the crypto Evidence Packet above.</p></div> : <DataStateNotice state="PROJECTION_MISSING" source="External context" affectsConclusion={false} detail="No supplemental external context is available for this view." />}</Section>
    <details className={`${surface} group`}><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-[var(--qt-type-caption-size)] font-bold uppercase text-[var(--qt-color-text-secondary)]"><span className="flex items-center gap-2"><FileSearch className="h-4 w-4" />Technical Evidence</span><span className="group-open:hidden">Show lineage, versions, and checksums</span><span className="hidden group-open:inline">Hide details</span></summary><div className="grid gap-4 border-t border-[var(--qt-color-border)] p-4 lg:grid-cols-2"><MetricRows data={{ verifiedFacts: payload.verifiedFacts, structuredInterpretation: payload.interpretation, sourceLineage: payload.sourceLineage }} /><MetricRows data={{ packetId: payload.packetId, packetVersionId: payload.packetVersionId, supersessionStatus: payload.supersessionStatus, recomputeIdentity: payload.recomputeIdentity, ruleVersions: payload.ruleVersions }} /></div></details>
  </div>
}

function SharedStatus({ projections, asOf }: { projections: unknown[]; asOf: unknown }) {
  const rows = projections.map(asRecord), coverage = rows.filter((row) => row.projectionKind === "CoverageDataStatusProjection"), lineage = rows.filter((row) => row.projectionKind === "SourceLineageSummaryProjection"), annotations = rows.filter((row) => row.projectionKind === "EventAnnotationProjection")
  return <details className={`${surface} group`}><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2"><span className={`${sectionTitle} flex items-center gap-2`}><ShieldCheck className="h-4 w-4 text-[var(--qt-color-success)]" />Coverage, lineage, and limitations</span><span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)] group-open:hidden">{coverage.length} Coverage · {lineage.length} lineage · {annotations.length} annotations</span><span className="hidden text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)] group-open:inline">Hide details</span></summary><div className="border-t border-[var(--qt-color-border)] p-4"><div className="flex flex-wrap gap-2">{coverage.slice(0, 24).map((row) => <Badge tone={stateTone(asRecord(row.payload).completenessClassification)} key={value(row, "projectionVersionId")}>{value(row, "subjectId")} {label(text(asRecord(row.payload).completenessClassification, "AVAILABLE"))}</Badge>)}</div><p className="mt-4 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">Values are governed as of {formatTimestamp(asOf)}. Optional liquidation, historical Order Book, and news enrichment remain explicitly classified.</p></div></details>
}

export default function MvpCutoverPage({ view }: { view: MvpView }) {
  const params = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<{ phase: "loading" | "ready" | "error"; response?: ProjectionResponse; reason?: string }>({ phase: "loading" })
  const query = params.toString(), instrument = params.get("instrument") || params.get("symbol") || "BTCUSDT", [cursor, setCursor] = useState(0)
  useEffect(() => { const controller = new AbortController(), request = new URLSearchParams(params); request.set("view", view); if (!request.get("instrument") && request.get("symbol")) request.set("instrument", request.get("symbol")!); if (!request.get("candidate") && request.get("candidateId")) request.set("candidate", request.get("candidateId")!); setState({ phase: "loading" }); fetch(`/api/mvp/projections?${request.toString()}`, { signal: controller.signal, headers: { Accept: "application/json" } }).then(async (response) => { let body: ProjectionResponse; try { body = await response.json() } catch { throw new Error("Projection response was not JSON.") }; if (!response.ok && body.status !== "ROLLBACK_ACTIVE") throw new Error(text(body.reason, `Projection read failed (${response.status}).`)); setState({ phase: "ready", response: body }) }).catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setState({ phase: "error", reason: error instanceof Error ? error.message : "Projection read failed." }) }); return () => controller.abort() }, [view, query, params])
  const href = useMemo(() => (target: MvpView, extra: Record<string, string> = {}) => { const next = new URLSearchParams(); preservedKeys.forEach((key) => { const current = params.get(key); if (current) next.set(key, current) }); Object.entries(extra).forEach(([key, current]) => { if (current) next.set(key, current) }); return `${routes[target]}?${next.toString()}` }, [params])
  if (state.phase === "loading") return <MvpCutoverLoadingShell view={view} />
  if (state.phase === "error") return <Status kind="READ ERROR" reason={state.reason} />
  const response = state.response!, status = text(response.status, "READY")
  if (status === "ROLLBACK_ACTIVE") { const LegacyPage = Legacy[view]; return <LegacyPage /> }
  if (["MISSING", "PROJECTION_MISSING", "NOT_FOUND"].includes(status)) return <Status kind="MISSING" reason={text(response.reason)} />
  if (["BLOCKED", "SOURCE_BLOCKED", "WITHHELD", "PROJECTION_WITHHELD", "CUTOVER_NOT_AUTHORIZED"].includes(status)) return <Status kind="BLOCKED" reason={text(response.reason)} />
  if (status !== "READY" && status !== "AVAILABLE" && status !== "SUCCESS") return <Status kind="UNAVAILABLE" reason={text(response.reason, status)} />
  const primaryKinds: Record<MvpView, string> = { dashboard: "DashboardMarketStateProjection", markets: "InstrumentMarketSummaryProjection", scanner: "ScannerCandidateProjection", trade: "TradeDecisionContextProjection", replay: "ReplayTimelineProjection", research: "ResearchEvidenceProjection" }
  const projections = asList(response.projections), primary = asRecord(projections.find((item) => asRecord(item).projectionKind === primaryKinds[view]) ?? response.data ?? response.payload)
  const payload = { ...asRecord(primary.payload), eventTimeStart: primary.eventTimeStart, eventTimeEnd: primary.eventTimeEnd, knowledgeTimeCutoff: primary.knowledgeTimeCutoff, projectionVersionId: primary.projectionVersionId, limitations: primary.limitations }
  const summaryProjection = projections.map(asRecord).find((item) => item.projectionKind === "InstrumentMarketSummaryProjection" && item.subjectId === instrument)
  const referenceValue = asRecord(asRecord(summaryProjection?.payload).latestGovernedPrice).close
  const body = view === "dashboard" ? <Dashboard payload={payload} projections={projections} href={href} /> : view === "markets" ? <Markets projections={projections} href={href} /> : view === "scanner" ? <Scanner payload={payload} href={href} /> : view === "trade" ? <Trade payload={payload} href={href} /> : view === "replay" ? <Replay payload={payload} cursor={cursor} onCursor={setCursor} href={href} instrument={instrument} /> : <Research payload={payload} projections={projections} />
  const selectInstrument = (nextInstrument: string) => { const next = new URLSearchParams(params); next.set("instrument", nextInstrument); next.delete("symbol"); next.delete("candidate"); next.delete("projection"); router.push(`${routes[view]}?${next.toString()}`) }
  return <main data-qt-foundation="mvp-cutover" className="min-h-screen overflow-x-hidden bg-[var(--qt-color-background)] px-3 py-4 font-[var(--qt-font-sans)] text-[var(--qt-color-text-primary)] sm:px-4"><div className="mx-auto grid max-w-[1600px] gap-4"><header className={`${surface} grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-base font-bold">{labels[view]}</h1><Badge tone="info">Governed Projection</Badge>{codes(payload.limitations).length ? <Badge tone="warning">{codes(payload.limitations).length} disclosed limitations</Badge> : null}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]"><span>Instrument {instrument}</span><span>Event window {formatTimestamp(payload.eventTimeStart)} to {formatTimestamp(payload.eventTimeEnd)}</span><span>Knowledge cutoff {formatTimestamp(payload.knowledgeTimeCutoff)}</span></div></div>{!["dashboard", "markets", "scanner"].includes(view) ? <label className="grid gap-1 text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-secondary)]" htmlFor="governed-instrument">Instrument<select id="governed-instrument" value={instrument} onChange={(event) => selectInstrument(event.target.value)} className="min-h-11 rounded-[var(--qt-radius-control)] border border-[var(--qt-color-border-strong)] bg-[var(--qt-color-background)] px-3 text-sm text-[var(--qt-color-text-primary)]">{instruments.map((symbol) => <option key={symbol}>{symbol}</option>)}</select></label> : null}</header>{["dashboard", "markets", "trade"].includes(view) ? <LiveOverlay instrument={instrument} referenceValue={referenceValue} projectionAsOf={payload.eventTimeEnd} /> : null}{body}<SharedStatus projections={projections} asOf={payload.eventTimeEnd} /></div></main>
}
