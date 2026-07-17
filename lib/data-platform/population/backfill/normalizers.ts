import { canonicalChecksum, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import { deriveCanonicalCommitId, deriveCanonicalRecordIdentity, validateRawObjectScope, type CanonicalCommitCommand, type CanonicalFact, type CanonicalFactReference, type GovernanceBindings, type RawObjectManifest } from "@/lib/data-platform/persistence"
import type { CandidateNormalizationInput, PopulationCandidate } from "@/lib/data-platform/population/contracts"

export const PRODUCTION_NORMALIZER_VERSION = "d3-phase3-normalizer-v1" as const
export interface ProductionNormalizationInput extends CandidateNormalizationInput {
  readonly rawObject: RawObjectManifest
  readonly operationType?: "INITIAL_VERSION" | "PROVIDER_CORRECTION" | "GOVERNED_IMPORT"
  readonly targetRecordVersion?: number
  readonly predecessor?: CanonicalFactReference | null
  readonly sourceContractVersion?: string
  readonly expectedSourceContractVersion?: string
}

function required(value: string, field: string): string { if (!value.trim()) throw new Error(`NORMALIZER_${field}_MISSING`); return value.trim() }
function timestamp(value: string, field: string): string { try { return normalizeIsoTimestamp(value) } catch { throw new Error(`NORMALIZER_${field}_INVALID`) } }
function decimal(value: string, field: string): string { if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error(`NORMALIZER_${field}_INVALID`); return value }
function providerDecimal(value: string, field: string): string { if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error(`NORMALIZER_${field}_INVALID`); return value }
function positiveInteger(value: number, field: string): number { if (!Number.isInteger(value) || value <= 0) throw new Error(`NORMALIZER_${field}_INVALID`); return value }

function governance(input: ProductionNormalizationInput): GovernanceBindings {
  return Object.freeze({ datasetRegistrySnapshotId: required(input.datasetRegistrySnapshotId, "DATASET_REGISTRY_SNAPSHOT"), providerRegistrySnapshotId: required(input.providerRegistrySnapshotId, "PROVIDER_REGISTRY_SNAPSHOT"), providerCertificationSnapshotId: required(input.providerCertificationSnapshotId, "PROVIDER_CERTIFICATION_SNAPSHOT"), policyVersionId: required(input.policyVersionId, "POLICY_VERSION"), schemaVersion: required(input.schemaVersion, "SCHEMA_VERSION"), normalizationVersion: required(input.normalizationVersion, "NORMALIZATION_VERSION") })
}

type CanonicalFactDraft = CanonicalFact extends infer Fact ? Fact extends CanonicalFact ? Omit<Fact, "identity" | "checksum"> : never : never

function completeFact<T extends CanonicalFact>(draft: CanonicalFactDraft, truth: unknown): T {
  const withChecksum = { ...draft, identity: { datasetId: "pending", businessIdentity: "pending", canonicalRecordId: "pending" }, checksum: canonicalChecksum(truth) } as T
  return Object.freeze({ ...withChecksum, identity: deriveCanonicalRecordIdentity(withChecksum) }) as unknown as T
}

function command(input: ProductionNormalizationInput, fact: CanonicalFact): CanonicalCommitCommand {
  if (input.candidate.validationStatus !== "ELIGIBLE" || input.candidate.qualityEligibility !== "ELIGIBLE" || input.candidate.normalizationEligibility !== "ELIGIBLE") throw new Error("CANDIDATE_NOT_ELIGIBLE")
  if (input.rawObject.objectId !== input.rawManifestId || input.rawObject.objectId !== input.candidate.rawManifestId || input.rawObject.verificationState !== "VERIFIED") throw new Error("RAW_OBJECT_BINDING_INVALID")
  const interval = fact.kind === "OHLCV" ? { start: fact.observedAt, end: fact.closeTime } : fact.kind === "FUNDING" ? { start: fact.fundingTime, end: null } : fact.kind === "OPEN_INTEREST" ? { start: fact.observedAt, end: null } : fact.kind === "AGG_TRADE" ? { start: fact.tradeTime, end: null } : null
  if (interval && fact.symbolOrSubject) {
    const scopeErrors = validateRawObjectScope({ datasetId: input.candidate.datasetId, providerId: input.candidate.providerId, providerSnapshotId: input.providerRegistrySnapshotId, instrument: fact.symbolOrSubject, sourceContractVersion: input.sourceContractVersion ?? input.candidate.parserVersion, expectedSourceContractVersion: input.expectedSourceContractVersion ?? input.candidate.parserVersion, intervalStart: interval.start, intervalEnd: interval.end, intervalPolicy: "CONTAINED", rawObject: input.rawObject })
    if (scopeErrors.length) throw new Error(`INVALID_CANONICAL_CANDIDATE_SCOPE:${scopeErrors.join(",")}`)
  }
  const targetRecordVersion = input.targetRecordVersion ?? 1
  const operationType = input.operationType ?? "INITIAL_VERSION"
  const predecessor = input.predecessor ?? null
  if (operationType === "PROVIDER_CORRECTION" && (!predecessor || targetRecordVersion !== predecessor.recordVersion + 1)) throw new Error("CORRECTION_VERSION_INVALID")
  const idempotencyKey = `candidate:${input.candidate.candidateId}:version:${targetRecordVersion}`
  const commitId = deriveCanonicalCommitId({ idempotencyKey, canonicalRecordId: fact.identity.canonicalRecordId, recordVersion: targetRecordVersion, checksum: fact.checksum })
  const edgeTruth = [input.rawObject.objectId, input.rawObject.contentHash, fact.identity.canonicalRecordId, targetRecordVersion, "NORMALIZED_FROM"]
  return Object.freeze({ operationType, idempotencyKey, initiatedAt: input.candidate.createdAt, rawObject: input.rawObject, fact, targetRecordVersion, predecessor, requiredLineage: Object.freeze([{ edgeId: `lin_${canonicalChecksum(edgeTruth)}`, source: { nodeType: "RAW_OBJECT" as const, nodeId: input.rawObject.objectId, nodeVersion: input.rawObject.contentHash }, destination: { nodeType: "CANONICAL_FACT" as const, nodeId: fact.identity.canonicalRecordId, nodeVersion: String(targetRecordVersion) }, relationship: "NORMALIZED_FROM" as const, commitId, createdAt: input.candidate.createdAt, digest: canonicalChecksum(edgeTruth) }]) })
}

function normalizeOhlcv(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "OHLCV" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload; const observedAt = timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT")
  const truth = { kind: "OHLCV", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), resolution: required(p.resolution, "RESOLUTION"), observedAt, closeTime: timestamp(p.closeTime, "CLOSE_TIME"), open: decimal(p.open, "OPEN"), high: decimal(p.high, "HIGH"), low: decimal(p.low, "LOW"), close: decimal(p.close, "CLOSE"), volume: decimal(p.volume, "VOLUME") }
  const fact = completeFact({ kind: "OHLCV", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt, effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : observedAt, governance: governance(input), resolution: truth.resolution, open: truth.open, high: truth.high, low: truth.low, close: truth.close, volume: truth.volume, closeTime: truth.closeTime }, truth)
  return command(input, fact)
}

function normalizeFunding(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "FUNDING" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload; const fundingTime = timestamp(p.fundingTime, "FUNDING_TIME"); const truth = { kind: "FUNDING", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), canonicalInstrumentId: required(p.canonicalInstrumentId, "CANONICAL_INSTRUMENT"), marketType: p.marketType, fundingRate: decimal(p.fundingRate, "FUNDING_RATE"), fundingTime, fundingIntervalHours: positiveInteger(p.fundingIntervalHours, "FUNDING_INTERVAL_HOURS") }
  if (truth.marketType !== "USD_M_FUTURES") throw new Error("NORMALIZER_MARKET_TYPE_INVALID")
  const fact = completeFact({ kind: "FUNDING", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt: timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT"), effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : fundingTime, governance: governance(input), canonicalInstrumentId: truth.canonicalInstrumentId, marketType: truth.marketType, fundingRate: truth.fundingRate, fundingTime, fundingIntervalHours: truth.fundingIntervalHours }, truth)
  return command(input, fact)
}

function normalizeOpenInterest(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "OPEN_INTEREST" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload; const observedAt = timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT"); const truth = { kind: "OPEN_INTEREST", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), canonicalInstrumentId: required(p.canonicalInstrumentId, "CANONICAL_INSTRUMENT"), marketType: p.marketType, openInterest: decimal(p.openInterest, "OPEN_INTEREST"), unit: p.unit, openInterestValue: p.openInterestValue === null ? null : decimal(p.openInterestValue, "OPEN_INTEREST_VALUE"), valueUnit: p.valueUnit, window: p.window, observedAt }
  if (truth.marketType !== "USD_M_FUTURES" || truth.unit !== "PROVIDER_NATIVE" || truth.window !== "5m" || (truth.openInterestValue === null) !== (truth.valueUnit === null) || (truth.valueUnit !== null && truth.valueUnit !== "PROVIDER_NATIVE_QUOTE_VALUE")) throw new Error("NORMALIZER_OPEN_INTEREST_METADATA_INVALID")
  const fact = completeFact({ kind: "OPEN_INTEREST", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt, effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : observedAt, governance: governance(input), canonicalInstrumentId: truth.canonicalInstrumentId, marketType: truth.marketType, openInterest: truth.openInterest, unit: truth.unit, openInterestValue: truth.openInterestValue, valueUnit: truth.valueUnit, window: truth.window }, truth)
  return command(input, fact)
}

function normalizeAggTrade(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "AGG_TRADE" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload
  const tradeTime = timestamp(p.tradeTime, "TRADE_TIME")
  const integer = (value: string, field: string) => { if (!/^\d+$/.test(value)) throw new Error(`NORMALIZER_${field}_INVALID`); return value }
  const truth = { kind: "AGG_TRADE", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), canonicalInstrumentId: required(p.canonicalInstrumentId, "CANONICAL_INSTRUMENT"), marketType: p.marketType, aggregateTradeId: integer(p.aggregateTradeId, "AGGREGATE_TRADE_ID"), price: providerDecimal(p.price, "PRICE"), quantity: providerDecimal(p.quantity, "QUANTITY"), firstTradeId: integer(p.firstTradeId, "FIRST_TRADE_ID"), lastTradeId: integer(p.lastTradeId, "LAST_TRADE_ID"), tradeTime, sourceTimestamp: integer(p.sourceTimestamp, "SOURCE_TIMESTAMP"), buyerIsMaker: p.buyerIsMaker }
  if (truth.marketType !== "USD_M_FUTURES" || BigInt(truth.firstTradeId) > BigInt(truth.lastTradeId)) throw new Error("NORMALIZER_AGG_TRADE_METADATA_INVALID")
  const fact = completeFact({ kind: "AGG_TRADE", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt: timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT"), effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : tradeTime, governance: governance(input), canonicalInstrumentId: truth.canonicalInstrumentId, marketType: truth.marketType, aggregateTradeId: truth.aggregateTradeId, price: truth.price, quantity: truth.quantity, firstTradeId: truth.firstTradeId, lastTradeId: truth.lastTradeId, tradeTime, sourceTimestamp: truth.sourceTimestamp, buyerIsMaker: truth.buyerIsMaker }, truth)
  return command(input, fact)
}

function normalizeLiquidation(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "LIQUIDATION" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload; const eventTime = timestamp(p.eventTime, "EVENT_TIME"); const truth = { kind: "LIQUIDATION", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), side: p.side, price: decimal(p.price, "PRICE"), quantity: decimal(p.quantity, "QUANTITY"), eventTime, providerRecordId: required(p.providerRecordId, "PROVIDER_RECORD_ID") }
  const fact = completeFact({ kind: "LIQUIDATION", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt: timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT"), effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : eventTime, governance: governance(input), side: truth.side, price: truth.price, quantity: truth.quantity, eventTime, providerRecordId: truth.providerRecordId }, truth)
  return command(input, fact)
}

function normalizeMacroObservation(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "MACRO_ECONOMIC_OBSERVATION" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload
  const observedAt = timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT")
  const truth = { kind: "MACRO_OBSERVATION", observationClass: "OFFICIAL_MACRO", providerId: input.candidate.providerId, seriesId: required(p.seriesId, "SERIES_ID"), subject: required(p.subject, "SUBJECT"), value: decimal(p.value, "VALUE"), unit: required(p.unit, "UNIT"), period: required(p.period, "PERIOD"), frequency: required(p.frequency, "FREQUENCY"), seasonalAdjustment: required(p.seasonalAdjustment, "SEASONAL_ADJUSTMENT"), realtimeStart: required(p.realtimeStart, "REALTIME_START"), realtimeEnd: required(p.realtimeEnd, "REALTIME_END"), releaseIdentity: required(p.releaseIdentity, "RELEASE_IDENTITY"), providerTier: required(p.providerTier, "PROVIDER_TIER") }
  const fact = completeFact({ kind: "MACRO_OBSERVATION", observationClass: "OFFICIAL_MACRO", providerId: input.candidate.providerId, venue: null, symbolOrSubject: truth.subject, observedAt, effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : observedAt, governance: governance(input), seriesId: truth.seriesId, value: truth.value, unit: truth.unit, period: truth.period }, truth)
  return command(input, fact)
}

function normalizeDailyMarketContext(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "DAILY_MARKET_CONTEXT_OBSERVATION" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload
  const observedAt = timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT")
  const truth = { kind: "MACRO_OBSERVATION", observationClass: "DAILY_MARKET_CONTEXT", providerId: input.candidate.providerId, seriesId: required(p.seriesId, "SERIES_ID"), subject: required(p.subject, "SUBJECT"), value: decimal(p.value, "VALUE"), open: p.open === null ? null : decimal(p.open, "OPEN"), high: p.high === null ? null : decimal(p.high, "HIGH"), low: p.low === null ? null : decimal(p.low, "LOW"), close: p.close === null ? null : decimal(p.close, "CLOSE"), volume: p.volume === null ? null : decimal(p.volume, "VOLUME"), timeZone: required(p.timeZone, "TIME_ZONE"), unit: required(p.unit, "UNIT"), period: required(p.period, "PERIOD"), frequency: p.frequency, licensingState: p.licensingState, providerTier: required(p.providerTier, "PROVIDER_TIER") }
  if (truth.frequency !== "DAILY" || truth.licensingState === "UNSUPPORTED") throw new Error("NORMALIZER_DAILY_MARKET_CONTEXT_METADATA_INVALID")
  const fact = completeFact({ kind: "MACRO_OBSERVATION", observationClass: "DAILY_MARKET_CONTEXT", providerId: input.candidate.providerId, venue: null, symbolOrSubject: truth.subject, observedAt, effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : observedAt, governance: governance(input), seriesId: truth.seriesId, value: truth.value, unit: truth.unit, period: truth.period }, truth)
  return command(input, fact)
}

function normalizeEtfFlow(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "ETF_FLOW_OBSERVATION" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload
  const observedAt = timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT")
  const truth = { kind: "ETF_OBSERVATION", providerId: input.candidate.providerId, instrumentId: required(p.instrumentId, "INSTRUMENT_ID"), fundId: required(p.fundId, "FUND_ID"), flowValue: decimal(p.flowValue, "FLOW_VALUE"), currency: p.currency, windowStart: timestamp(p.windowStart, "WINDOW_START"), windowEnd: timestamp(p.windowEnd, "WINDOW_END"), sourceValueState: p.sourceValueState, sourceReportedDate: required(p.sourceReportedDate, "SOURCE_REPORTED_DATE"), providerTier: required(p.providerTier, "PROVIDER_TIER") }
  if (truth.currency !== "USD" || (Number(truth.flowValue) === 0 ? truth.sourceValueState !== "ZERO" : Number(truth.flowValue) > 0 ? truth.sourceValueState !== "POSITIVE" : truth.sourceValueState !== "NEGATIVE")) throw new Error("NORMALIZER_ETF_FLOW_METADATA_INVALID")
  const fact = completeFact({ kind: "ETF_OBSERVATION", providerId: input.candidate.providerId, venue: null, symbolOrSubject: truth.instrumentId, observedAt, effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : truth.windowEnd, governance: governance(input), instrumentId: truth.fundId, flowValue: truth.flowValue, currency: truth.currency, windowStart: truth.windowStart, windowEnd: truth.windowEnd }, truth)
  return command(input, fact)
}

export class ProductionNormalizerRegistry {
  normalize(input: ProductionNormalizationInput): CanonicalCommitCommand {
    if (input.normalizationVersion !== PRODUCTION_NORMALIZER_VERSION) throw new Error("NORMALIZER_VERSION_UNAVAILABLE")
    if (input.candidate.kind === "OHLCV" && input.candidate.datasetId === "ohlcv") return normalizeOhlcv({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "FUNDING" && input.candidate.datasetId === "funding") return normalizeFunding({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "OPEN_INTEREST" && input.candidate.datasetId === "open-interest") return normalizeOpenInterest({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "AGG_TRADE" && input.candidate.datasetId === "agg-trade") return normalizeAggTrade({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "LIQUIDATION" && input.candidate.datasetId === "liquidation") return normalizeLiquidation({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "MACRO_ECONOMIC_OBSERVATION" && input.candidate.datasetId === "macro") return normalizeMacroObservation({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "DAILY_MARKET_CONTEXT_OBSERVATION" && input.candidate.datasetId === "daily-market-context") return normalizeDailyMarketContext({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "ETF_FLOW_OBSERVATION" && input.candidate.datasetId === "etf-flow") return normalizeEtfFlow({ ...input, candidate: input.candidate })
    throw new Error("PRODUCTION_NORMALIZER_NOT_REGISTERED")
  }
  bindings() { return Object.freeze(["ohlcv:OHLCV", "funding:FUNDING", "open-interest:OPEN_INTEREST", "liquidation:LIQUIDATION", "macro:MACRO_ECONOMIC_OBSERVATION", "daily-market-context:DAILY_MARKET_CONTEXT_OBSERVATION", "etf-flow:ETF_FLOW_OBSERVATION"].map((value) => { const [datasetId, candidateKind] = value.split(":"); return Object.freeze({ datasetId, candidateKind, normalizerId: `normalize.${datasetId}`, version: PRODUCTION_NORMALIZER_VERSION, status: "AVAILABLE" as const }) })) }
}
