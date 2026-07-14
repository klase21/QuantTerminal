import type { MvpProjectionKind, MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import type { MvpProjectionExposureDecision } from "@/lib/data-platform/consistency-evidence/postgres"

export const MVP_CONSUMER_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
export type MvpConsumerInstrument = typeof MVP_CONSUMER_INSTRUMENTS[number]
export type MvpConsumerView = "dashboard" | "markets" | "scanner" | "trade" | "replay" | "research"
export type MvpClassifiedState = "AVAILABLE" | "STALE" | "GAP" | "BACKFILL_PENDING" | "SOURCE_UNAVAILABLE" | "SOURCE_BLOCKED" | "UNSUPPORTED" | "EXPERIMENTAL" | "LOWER_BOUND" | "NOT_APPLICABLE" | "PROJECTION_MISSING" | "PROJECTION_WITHHELD" | "READ_ERROR"

export interface ConsumerProjection {
  readonly projectionId: string
  readonly projectionVersionId: string
  readonly projectionKind: MvpProjectionKind
  readonly subjectId: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly knowledgeTimeCutoff: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly completeness: string
  readonly limitations: readonly string[]
  readonly lifecycleState: string
  readonly effectiveExposure: "CONSUMER_VISIBLE"
  readonly projectionChecksum: string
}
export interface MvpConsumerBundle {
  readonly status: "AVAILABLE"
  readonly view: MvpConsumerView
  readonly projectionCorpusId: string
  readonly projectionCorpusChecksum: string
  readonly exposureDecisionId: string
  readonly generatedAt: string
  readonly projections: readonly ConsumerProjection[]
}

export interface MvpConsumerProjectionSource {
  latest(kind: MvpProjectionKind, subjectId: string): Promise<MvpProjectionVersion | null>
  byVersion(projectionVersionId: string): Promise<MvpProjectionVersion | null>
  list(input: { readonly kind?: MvpProjectionKind; readonly subjectId?: string; readonly start?: string; readonly end?: string; readonly exposure?: "READY_FOR_CUTOVER"; readonly limit: number; readonly offset?: number }): Promise<readonly MvpProjectionVersion[]>
  exposure(): Promise<MvpProjectionExposureDecision | null>
}

export class MvpConsumerFacadeError extends Error {
  constructor(readonly reasonCode: "ROLLBACK_ACTIVE" | "CUTOVER_NOT_AUTHORIZED" | "PROJECTION_MISSING" | "PROJECTION_WITHHELD" | "INVALID_QUERY", message: string) { super(message) }
}

function expose(value: MvpProjectionVersion): ConsumerProjection {
  if (value.lifecycleState === "WITHHELD" || value.lifecycleState === "INVALID") throw new MvpConsumerFacadeError("PROJECTION_WITHHELD", `Projection ${value.projectionVersionId} is not consumer eligible.`)
  if (value.lifecycleState !== "GENERATED" || value.consumerExposureState !== "READY_FOR_CUTOVER") throw new MvpConsumerFacadeError("PROJECTION_WITHHELD", `Projection ${value.projectionVersionId} is outside the reviewed lifecycle.`)
  return Object.freeze({ projectionId: value.projectionId, projectionVersionId: value.projectionVersionId, projectionKind: value.projectionKind, subjectId: value.subjectId, eventTimeStart: value.eventTimeStart, eventTimeEnd: value.eventTimeEnd, knowledgeTimeCutoff: value.knowledgeTimeCutoff, payload: value.structuredPayload, completeness: value.completeness, limitations: value.limitations, lifecycleState: value.lifecycleState, effectiveExposure: "CONSUMER_VISIBLE", projectionChecksum: value.projectionChecksum })
}

export class MvpConsumerProjectionFacade {
  constructor(private readonly source: MvpConsumerProjectionSource, private readonly corpus: { readonly id: string; readonly checksum: string }) {}

  async read(input: { readonly view: MvpConsumerView; readonly instrument?: MvpConsumerInstrument; readonly start?: string; readonly end?: string; readonly candidateId?: string; readonly projectionVersionId?: string }): Promise<MvpConsumerBundle> {
    const decision = await this.source.exposure()
    if (!decision || decision.projectionCorpusChecksum !== this.corpus.checksum) throw new MvpConsumerFacadeError("CUTOVER_NOT_AUTHORIZED", "The governed Projection corpus has no matching cutover decision.")
    if (decision.effectiveExposure !== "CONSUMER_VISIBLE") throw new MvpConsumerFacadeError("ROLLBACK_ACTIVE", "The audited rollback decision is active.")
    const values = await this.readView(input)
    if (!values.length) throw new MvpConsumerFacadeError("PROJECTION_MISSING", "No governed Projection matches the bounded query.")
    return Object.freeze({ status: "AVAILABLE", view: input.view, projectionCorpusId: this.corpus.id, projectionCorpusChecksum: this.corpus.checksum, exposureDecisionId: decision.decisionId, generatedAt: values.map((value) => value.knowledgeTimeCutoff).sort().at(-1)!, projections: Object.freeze(values.map(expose)) })
  }

  private async readView(input: { readonly view: MvpConsumerView; readonly instrument?: MvpConsumerInstrument; readonly start?: string; readonly end?: string; readonly candidateId?: string; readonly projectionVersionId?: string }): Promise<readonly MvpProjectionVersion[]> {
    if (input.view === "dashboard") return this.required([await this.source.latest("DashboardMarketStateProjection", "MVP_SIX_INSTRUMENTS"), ...await this.latestForAll("InstrumentMarketSummaryProjection"), ...await this.latestForAll("SourceLineageSummaryProjection"), ...await this.latestForAll("EventAnnotationProjection"), ...await this.latestCoverage()])
    if (input.view === "markets") return this.required([...await this.latestForAll("InstrumentMarketSummaryProjection"), ...await this.latestForAll("SourceLineageSummaryProjection"), ...await this.latestCoverage()])
    if (input.view === "scanner") return this.required([await this.source.latest("ScannerCandidateProjection", "MVP_SIX_INSTRUMENTS"), ...await this.latestForAll("ResearchEvidenceProjection"), ...await this.latestCoverage()])
    const instrument = input.instrument
    if (!instrument || !MVP_CONSUMER_INSTRUMENTS.includes(instrument)) throw new MvpConsumerFacadeError("INVALID_QUERY", "A governed instrument is required.")
    if (input.view === "trade") {
      const values = this.required([await this.source.latest("TradeDecisionContextProjection", instrument), await this.source.latest("InstrumentMarketSummaryProjection", instrument), await this.source.latest("ResearchEvidenceProjection", instrument), await this.source.latest("SourceLineageSummaryProjection", instrument), ...await this.latestCoverage(instrument)])
      const context = values.find((value) => value.projectionKind === "TradeDecisionContextProjection")
      if (input.candidateId && context?.structuredPayload.sourceCandidateIdentity !== input.candidateId) throw new MvpConsumerFacadeError("PROJECTION_MISSING", "Candidate identity does not match the governed Trade context.")
      return values
    }
    if (input.projectionVersionId) {
      const exact = await this.source.byVersion(input.projectionVersionId)
      if (!exact || exact.subjectId !== instrument || (input.view === "replay" && exact.projectionKind !== "ReplayTimelineProjection") || (input.view === "research" && exact.projectionKind !== "ResearchEvidenceProjection")) throw new MvpConsumerFacadeError("PROJECTION_MISSING", "The requested Projection identity does not match this route.")
      return this.required([exact, await this.source.latest("SourceLineageSummaryProjection", instrument), ...await this.latestCoverage(instrument)])
    }
    const kind = input.view === "replay" ? "ReplayTimelineProjection" as const : "ResearchEvidenceProjection" as const
    const primary = input.start && input.end ? (await this.source.list({ kind, subjectId: instrument, start: input.start, end: input.end, exposure: "READY_FOR_CUTOVER", limit: 2 }))[0] ?? null : await this.source.latest(kind, instrument)
    const annotations = input.view === "replay" || input.view === "research" ? (input.start && input.end ? await this.source.list({ kind: "EventAnnotationProjection", subjectId: instrument, start: input.start, end: input.end, exposure: "READY_FOR_CUTOVER", limit: 2 }) : this.required([await this.source.latest("EventAnnotationProjection", instrument)])) : []
    return this.required([primary, await this.source.latest("SourceLineageSummaryProjection", instrument), ...annotations, ...await this.latestCoverage(instrument)])
  }

  private async latestForAll(kind: MvpProjectionKind) { return Promise.all(MVP_CONSUMER_INSTRUMENTS.map((instrument) => this.source.latest(kind, instrument))) }
  private async latestCoverage(instrument?: MvpConsumerInstrument) {
    const instruments = instrument ? [instrument] : MVP_CONSUMER_INSTRUMENTS
    const datasets = ["ohlcv", "funding", "openInterest", "aggTrades"]
    return Promise.all(instruments.flatMap((symbol) => datasets.map((dataset) => this.source.latest("CoverageDataStatusProjection", `${symbol}:${dataset}`))))
  }
  private required(values: readonly (MvpProjectionVersion | null)[]): readonly MvpProjectionVersion[] { return values.filter((value): value is MvpProjectionVersion => Boolean(value)) }
}

export function buildMvpNavigationHref(pathname: "/dashboard" | "/markets" | "/scanner" | "/trade" | "/replay" | "/research", context: { readonly instrument?: string; readonly start?: string; readonly end?: string; readonly candidateId?: string; readonly evidenceId?: string; readonly projectionVersionId?: string }): string {
  const params = new URLSearchParams()
  if (context.instrument) params.set("instrument", context.instrument)
  if (context.start) params.set("start", context.start)
  if (context.end) params.set("end", context.end)
  if (context.candidateId) params.set("candidate", context.candidateId)
  if (context.evidenceId) params.set("evidence", context.evidenceId)
  if (context.projectionVersionId) params.set("projection", context.projectionVersionId)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
