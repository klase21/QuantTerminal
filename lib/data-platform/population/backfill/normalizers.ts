import { canonicalChecksum, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import { deriveCanonicalCommitId, deriveCanonicalRecordIdentity, type CanonicalCommitCommand, type CanonicalFact, type CanonicalFactReference, type GovernanceBindings, type RawObjectManifest } from "@/lib/data-platform/persistence"
import type { CandidateNormalizationInput, PopulationCandidate } from "@/lib/data-platform/population/contracts"

export const PRODUCTION_NORMALIZER_VERSION = "d3-phase3-normalizer-v1" as const
export interface ProductionNormalizationInput extends CandidateNormalizationInput {
  readonly rawObject: RawObjectManifest
  readonly operationType?: "INITIAL_VERSION" | "PROVIDER_CORRECTION" | "GOVERNED_IMPORT"
  readonly targetRecordVersion?: number
  readonly predecessor?: CanonicalFactReference | null
}

function required(value: string, field: string): string { if (!value.trim()) throw new Error(`NORMALIZER_${field}_MISSING`); return value.trim() }
function timestamp(value: string, field: string): string { try { return normalizeIsoTimestamp(value) } catch { throw new Error(`NORMALIZER_${field}_INVALID`) } }
function decimal(value: string, field: string): string { if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error(`NORMALIZER_${field}_INVALID`); return value }
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
  const p = input.candidate.payload; const observedAt = timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT"); const truth = { kind: "OPEN_INTEREST", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), openInterest: decimal(p.openInterest, "OPEN_INTEREST"), unit: required(p.unit, "UNIT"), window: required(p.window, "WINDOW"), observedAt }
  const fact = completeFact({ kind: "OPEN_INTEREST", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt, effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : null, governance: governance(input), openInterest: truth.openInterest, unit: truth.unit, window: truth.window }, truth)
  return command(input, fact)
}

function normalizeLiquidation(input: ProductionNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: "LIQUIDATION" }> }): CanonicalCommitCommand {
  const p = input.candidate.payload; const eventTime = timestamp(p.eventTime, "EVENT_TIME"); const truth = { kind: "LIQUIDATION", providerId: input.candidate.providerId, venue: "BINANCE", symbol: required(p.symbol, "SYMBOL").toUpperCase(), side: p.side, price: decimal(p.price, "PRICE"), quantity: decimal(p.quantity, "QUANTITY"), eventTime, providerRecordId: required(p.providerRecordId, "PROVIDER_RECORD_ID") }
  const fact = completeFact({ kind: "LIQUIDATION", providerId: input.candidate.providerId, venue: "BINANCE", symbolOrSubject: truth.symbol, observedAt: timestamp(input.candidate.sourceObservedAt, "OBSERVED_AT"), effectiveAt: input.candidate.effectiveAt ? timestamp(input.candidate.effectiveAt, "EFFECTIVE_AT") : eventTime, governance: governance(input), side: truth.side, price: truth.price, quantity: truth.quantity, eventTime, providerRecordId: truth.providerRecordId }, truth)
  return command(input, fact)
}

export class ProductionNormalizerRegistry {
  normalize(input: ProductionNormalizationInput): CanonicalCommitCommand {
    if (input.normalizationVersion !== PRODUCTION_NORMALIZER_VERSION) throw new Error("NORMALIZER_VERSION_UNAVAILABLE")
    if (input.candidate.kind === "OHLCV" && input.candidate.datasetId === "ohlcv") return normalizeOhlcv({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "FUNDING" && input.candidate.datasetId === "funding") return normalizeFunding({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "OPEN_INTEREST" && input.candidate.datasetId === "open-interest") return normalizeOpenInterest({ ...input, candidate: input.candidate })
    if (input.candidate.kind === "LIQUIDATION" && input.candidate.datasetId === "liquidation") return normalizeLiquidation({ ...input, candidate: input.candidate })
    throw new Error("PRODUCTION_NORMALIZER_NOT_REGISTERED")
  }
  bindings() { return Object.freeze(["ohlcv:OHLCV", "funding:FUNDING", "open-interest:OPEN_INTEREST", "liquidation:LIQUIDATION"].map((value) => { const [datasetId, candidateKind] = value.split(":"); return Object.freeze({ datasetId, candidateKind, normalizerId: `normalize.${datasetId}`, version: PRODUCTION_NORMALIZER_VERSION, status: "AVAILABLE" as const }) })) }
}
