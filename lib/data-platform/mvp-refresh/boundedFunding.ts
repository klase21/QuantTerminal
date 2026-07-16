import { createHash } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { PRODUCTION_NORMALIZER_VERSION, ProductionNormalizerRegistry } from "@/lib/data-platform/population/backfill/normalizers"
import type { CanonicalCommitPort, ObjectStoragePort, PopulationCandidate } from "@/lib/data-platform/population/contracts"
import type { RawObjectManifest } from "@/lib/data-platform/persistence"
import type { MvpRefreshStore } from "./store"

export const BOUNDED_FUNDING_PROVIDER = "binance-official-rest-funding-rate" as const
export const BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION = "binance-official-rest-funding-rate/1.0.0" as const
export const BOUNDED_FUNDING_PARSER_VERSION = "mvp-bounded-funding-json/1.0.0" as const
export const BOUNDED_FUNDING_MAX_INTERVAL_MS = 86_400_000
export const BOUNDED_FUNDING_FINALIZATION_DELAY_MS = 2 * 60 * 60 * 1_000
export const MVP_FUNDING_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)

export type BoundedFundingStatus = "CREATED" | "DUPLICATE" | "NO_DATA" | "SOURCE_UNAVAILABLE" | "SOURCE_NOT_FINALIZED" | "SOURCE_GAP" | "SOURCE_CHECKSUM_MISMATCH" | "MALFORMED_SOURCE_DATA" | "CANONICAL_CONFLICT" | "BLOCKED" | "FAILED"

export interface BoundedFundingRefreshRequest {
  readonly provider: typeof BOUNDED_FUNDING_PROVIDER
  readonly instrument: typeof MVP_FUNDING_INSTRUMENTS[number]
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly sourceContractVersion: typeof BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION
  readonly expectedSourceIdentity: string
  readonly maximumEventCount: number | null
  readonly requestedAt: string
  readonly requestIdentity: string
}

export interface ProviderNativeFundingEvent {
  readonly provider: typeof BOUNDED_FUNDING_PROVIDER
  readonly instrument: typeof MVP_FUNDING_INSTRUMENTS[number]
  readonly providerEventTimestamp: string
  readonly providerEventTimestampRaw: string
  readonly providerRateValue: string
  readonly providerSourceIdentity: string
  readonly sourceResponseChecksum: string
  readonly retrievalIdentity: string
  readonly rawArtifactIdentity: string
  readonly sourceContractVersion: typeof BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION
  readonly observedAt: string
}

export interface BoundedFundingRefreshResult {
  readonly requestIdentity: string
  readonly retrievalIdentity: string
  readonly rawArtifactIdentity: string | null
  readonly candidateIdentities: readonly string[]
  readonly canonicalCommitResults: readonly { readonly candidateId: string; readonly status: string; readonly canonicalRecordId: string | null }[]
  readonly sourceObservedThrough: string | null
  readonly finalizedThrough: string
  readonly eventCount: number
  readonly duplicateCount: number
  readonly conflictCount: number
  readonly malformedCount: number
  readonly coverageState: "COMPLETE" | "PARTIAL" | "UNAVAILABLE" | "INCONSISTENT"
  readonly checksum: string
  readonly limitations: readonly string[]
  readonly status: BoundedFundingStatus
}

interface BinanceFundingRow { readonly symbol?: unknown; readonly fundingTime?: unknown; readonly fundingRate?: unknown }

export interface BoundedFundingControlPlane {
  readonly store: MvpRefreshStore
  readonly unitId: string
  readonly leaseKey: string
  readonly ownerId: string
  readonly fencingToken: number
}

export interface RunBoundedFundingOptions {
  readonly request: BoundedFundingRefreshRequest
  readonly storage: ObjectStoragePort
  readonly canonicalPort: CanonicalCommitPort
  readonly fetchImpl?: typeof fetch
  readonly retrievedAt: string
  readonly controlPlane?: BoundedFundingControlPlane
}

function iso(value: string, code: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(code)
  return value
}

export function createBoundedFundingRequest(input: Omit<BoundedFundingRefreshRequest, "sourceContractVersion" | "expectedSourceIdentity" | "requestIdentity">, now = new Date().toISOString()): BoundedFundingRefreshRequest {
  if (input.provider !== BOUNDED_FUNDING_PROVIDER) throw new Error("FUNDING_PROVIDER_SOURCE_MISMATCH")
  if (!MVP_FUNDING_INSTRUMENTS.includes(input.instrument)) throw new Error("FUNDING_INSTRUMENT_INVALID")
  const start = Date.parse(iso(input.eventTimeStart, "FUNDING_START_INVALID"))
  const end = Date.parse(iso(input.eventTimeEnd, "FUNDING_END_INVALID"))
  const requestedAt = iso(input.requestedAt, "FUNDING_REQUESTED_AT_INVALID")
  const nowMs = Date.parse(iso(now, "FUNDING_NOW_INVALID"))
  if (end <= start) throw new Error("FUNDING_INTERVAL_INVALID")
  if (end - start > BOUNDED_FUNDING_MAX_INTERVAL_MS) throw new Error("FUNDING_INTERVAL_EXCEEDS_MAXIMUM")
  if (end > nowMs) throw new Error("FUNDING_FUTURE_INTERVAL_REJECTED")
  if (end > nowMs - BOUNDED_FUNDING_FINALIZATION_DELAY_MS) throw new Error("SOURCE_NOT_FINALIZED")
  if (input.maximumEventCount !== null && (!Number.isInteger(input.maximumEventCount) || input.maximumEventCount < 1 || input.maximumEventCount > 1_000)) throw new Error("FUNDING_MAXIMUM_EVENT_COUNT_INVALID")
  const expectedSourceIdentity = `binance-fapi:fundingRate:${input.instrument}:${input.eventTimeStart}:${input.eventTimeEnd}`
  const requestIdentity = `mfrq_${canonicalChecksum({ provider: input.provider, instrument: input.instrument, eventTimeStart: input.eventTimeStart, eventTimeEnd: input.eventTimeEnd, sourceContractVersion: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION, expectedSourceIdentity, maximumEventCount: input.maximumEventCount })}`
  return Object.freeze({ ...input, requestedAt, sourceContractVersion: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION, expectedSourceIdentity, requestIdentity })
}

export function createBoundedFundingSourceUrl(request: BoundedFundingRefreshRequest): URL {
  const url = new URL("https://fapi.binance.com/fapi/v1/fundingRate")
  url.searchParams.set("symbol", request.instrument)
  url.searchParams.set("startTime", String(Date.parse(request.eventTimeStart)))
  url.searchParams.set("endTime", String(Date.parse(request.eventTimeEnd) - 1))
  url.searchParams.set("limit", String(request.maximumEventCount ?? 1_000))
  return url
}

export function parseBoundedFundingEvents(input: { readonly bytes: Uint8Array; readonly request: BoundedFundingRefreshRequest; readonly retrievalIdentity: string; readonly rawArtifactIdentity: string; readonly observedAt: string }): readonly ProviderNativeFundingEvent[] {
  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder().decode(input.bytes)) } catch { throw new Error("MALFORMED_SOURCE_DATA") }
  if (!Array.isArray(parsed)) throw new Error("MALFORMED_SOURCE_DATA")
  const sourceResponseChecksum = createHash("sha256").update(input.bytes).digest("hex")
  const seen = new Map<string, string>()
  const events = parsed.map((value) => {
    const row = value as BinanceFundingRow
    if (row.symbol !== input.request.instrument || !Number.isSafeInteger(row.fundingTime) || typeof row.fundingRate !== "string" || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(row.fundingRate) || !Number.isFinite(Number(row.fundingRate))) throw new Error("MALFORMED_SOURCE_DATA")
    const eventMs = row.fundingTime as number
    if (eventMs < Date.parse(input.request.eventTimeStart) || eventMs >= Date.parse(input.request.eventTimeEnd)) throw new Error("FUNDING_EVENT_OUT_OF_WINDOW")
    const timestamp = new Date(eventMs).toISOString()
    const existing = seen.get(timestamp)
    if (existing && existing !== row.fundingRate) throw new Error("CANONICAL_CONFLICT")
    if (existing) throw new Error("MALFORMED_SOURCE_DATA")
    seen.set(timestamp, row.fundingRate)
    return Object.freeze({ provider: BOUNDED_FUNDING_PROVIDER, instrument: input.request.instrument, providerEventTimestamp: timestamp, providerEventTimestampRaw: String(eventMs), providerRateValue: row.fundingRate, providerSourceIdentity: input.request.expectedSourceIdentity, sourceResponseChecksum, retrievalIdentity: input.retrievalIdentity, rawArtifactIdentity: input.rawArtifactIdentity, sourceContractVersion: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION, observedAt: input.observedAt })
  }).sort((left, right) => left.providerEventTimestamp.localeCompare(right.providerEventTimestamp))
  return Object.freeze(events)
}

function rawManifest(request: BoundedFundingRefreshRequest, retrievalIdentity: string, artifact: { readonly rawManifestId: string; readonly contentHash: string; readonly objectStorageKey: string }, sizeBytes: number, retrievedAt: string): RawObjectManifest {
  return Object.freeze({ objectId: artifact.rawManifestId, datasetId: "funding", providerId: request.provider, venue: "BINANCE", symbolOrSubject: request.instrument, windowStart: request.eventTimeStart, windowEnd: request.eventTimeEnd, contentHash: artifact.contentHash, sizeBytes, mediaType: "application/json", compression: "NONE", retrievedAt, providerSnapshotId: `mvp-bounded-funding-provider:${BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION}`, retentionClass: "STANDARD", verificationState: "VERIFIED", objectStorageKey: artifact.objectStorageKey, createdAt: retrievedAt })
}

export function createBoundedFundingCandidate(event: ProviderNativeFundingEvent, unitId: string, rawManifestId: string, createdAt: string): Extract<PopulationCandidate, { readonly kind: "FUNDING" }> {
  const canonicalInstrumentId = `binance-usdm-perpetual:${event.instrument.slice(0, -4)}-USDT`
  const sourceObservationId = `${event.provider}:${event.instrument}:${event.providerEventTimestamp}`
  const payload = Object.freeze({ symbol: event.instrument, canonicalInstrumentId, marketType: "USD_M_FUTURES" as const, fundingRate: event.providerRateValue, fundingTime: event.providerEventTimestamp, fundingIntervalHours: 8 })
  const candidateChecksum = canonicalChecksum({ rawManifestId, sourceObservationId, parserVersion: BOUNDED_FUNDING_PARSER_VERSION, payload })
  return Object.freeze({ kind: "FUNDING", candidateId: `mfc_${candidateChecksum}`, unitId, retrievalAttemptId: event.retrievalIdentity, rawManifestId, datasetId: "funding", providerId: event.provider, providerSnapshotId: `mvp-bounded-funding-provider:${BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION}`, sourceObservationId, sourceObservedAt: event.providerEventTimestamp, effectiveAt: event.providerEventTimestamp, parserVersion: BOUNDED_FUNDING_PARSER_VERSION, candidateSchemaVersion: "1.0.0", payload, candidateChecksum, validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt })
}

export async function runBoundedFundingRefresh(options: RunBoundedFundingOptions): Promise<BoundedFundingRefreshResult> {
  const retrievalIdentity = `mfrr_${canonicalChecksum({ requestIdentity: options.request.requestIdentity, sourceIdentity: options.request.expectedSourceIdentity })}`
  const finish = (value: Omit<BoundedFundingRefreshResult, "requestIdentity" | "retrievalIdentity" | "checksum">): BoundedFundingRefreshResult => {
    const basis = { requestIdentity: options.request.requestIdentity, retrievalIdentity, ...value }
    return Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
  }
  if (options.controlPlane) await options.controlPlane.store.assertFence(options.controlPlane.leaseKey, options.controlPlane.ownerId, options.controlPlane.fencingToken)
  let response: Response
  try { response = await (options.fetchImpl ?? fetch)(createBoundedFundingSourceUrl(options.request), { cache: "no-store" }) } catch { return finish({ rawArtifactIdentity: null, candidateIdentities: [], canonicalCommitResults: [], sourceObservedThrough: null, finalizedThrough: options.request.eventTimeEnd, eventCount: 0, duplicateCount: 0, conflictCount: 0, malformedCount: 0, coverageState: "UNAVAILABLE", limitations: ["SOURCE_UNAVAILABLE"], status: "SOURCE_UNAVAILABLE" }) }
  if (!response.ok) return finish({ rawArtifactIdentity: null, candidateIdentities: [], canonicalCommitResults: [], sourceObservedThrough: null, finalizedThrough: options.request.eventTimeEnd, eventCount: 0, duplicateCount: 0, conflictCount: 0, malformedCount: 0, coverageState: "UNAVAILABLE", limitations: [`SOURCE_HTTP_${response.status}`], status: "SOURCE_UNAVAILABLE" })
  const bytes = new Uint8Array(await response.arrayBuffer())
  const contentHash = createHash("sha256").update(bytes).digest("hex")
  const objectStorageKey = `mvp-refresh/funding/${options.request.instrument}/${options.request.eventTimeStart.slice(0, 10)}/${contentHash}.json`
  let artifact
  try { artifact = await options.storage.putImmutable({ objectStorageKey, contentHash, mediaType: "application/json", byteLength: bytes.byteLength, content: (async function* () { yield bytes })() }) } catch (error) {
    const status = error instanceof Error && /(CHECKSUM|VERIFICATION|IMMUTABLE_OBJECT_CONFLICT)/.test(error.message) ? "SOURCE_CHECKSUM_MISMATCH" : "BLOCKED"
    return finish({ rawArtifactIdentity: null, candidateIdentities: [], canonicalCommitResults: [], sourceObservedThrough: null, finalizedThrough: options.request.eventTimeEnd, eventCount: 0, duplicateCount: 0, conflictCount: 0, malformedCount: 0, coverageState: "INCONSISTENT", limitations: [status], status })
  }
  const manifest = rawManifest(options.request, retrievalIdentity, artifact, bytes.byteLength, options.retrievedAt)
  if (options.controlPlane) {
    await options.controlPlane.store.recordArtifact({ unitId: options.controlPlane.unitId, artifactId: `mfra_${canonicalChecksum({ unitId: options.controlPlane.unitId, rawArtifactIdentity: artifact.rawObjectId })}`, artifactKind: "FUNDING_RAW_RESPONSE", contentChecksum: contentHash, byteCount: bytes.byteLength, lineage: { rawArtifactIdentity: artifact.rawObjectId, provider: options.request.provider, instrument: options.request.instrument, intervalStart: options.request.eventTimeStart, intervalEnd: options.request.eventTimeEnd, retrievalIdentity, sourceContractVersion: options.request.sourceContractVersion } })
    await options.controlPlane.store.writeCheckpoint(options.controlPlane.unitId, { stage: "ACQUIRED", retrievalIdentity, rawArtifactIdentity: artifact.rawObjectId, sourceChecksum: contentHash })
  }
  let events: readonly ProviderNativeFundingEvent[]
  try { events = parseBoundedFundingEvents({ bytes, request: options.request, retrievalIdentity, rawArtifactIdentity: artifact.rawObjectId, observedAt: options.retrievedAt }) } catch (error) {
    const status = error instanceof Error && error.message === "CANONICAL_CONFLICT" ? "CANONICAL_CONFLICT" : "MALFORMED_SOURCE_DATA"
    return finish({ rawArtifactIdentity: artifact.rawObjectId, candidateIdentities: [], canonicalCommitResults: [], sourceObservedThrough: null, finalizedThrough: options.request.eventTimeEnd, eventCount: 0, duplicateCount: 0, conflictCount: status === "CANONICAL_CONFLICT" ? 1 : 0, malformedCount: status === "MALFORMED_SOURCE_DATA" ? 1 : 0, coverageState: "INCONSISTENT", limitations: [error instanceof Error ? error.message : status], status })
  }
  if (!events.length) return finish({ rawArtifactIdentity: artifact.rawObjectId, candidateIdentities: [], canonicalCommitResults: [], sourceObservedThrough: null, finalizedThrough: options.request.eventTimeEnd, eventCount: 0, duplicateCount: 0, conflictCount: 0, malformedCount: 0, coverageState: "UNAVAILABLE", limitations: ["NO_PROVIDER_EVENTS"], status: "NO_DATA" })
  if (options.request.maximumEventCount !== null && events.length > options.request.maximumEventCount) return finish({ rawArtifactIdentity: artifact.rawObjectId, candidateIdentities: [], canonicalCommitResults: [], sourceObservedThrough: null, finalizedThrough: options.request.eventTimeEnd, eventCount: events.length, duplicateCount: 0, conflictCount: 0, malformedCount: 0, coverageState: "INCONSISTENT", limitations: ["MAXIMUM_EVENT_COUNT_EXCEEDED"], status: "BLOCKED" })
  if (options.controlPlane) { await options.controlPlane.store.assertFence(options.controlPlane.leaseKey, options.controlPlane.ownerId, options.controlPlane.fencingToken); await options.controlPlane.store.transitionUnit(options.controlPlane.unitId, "ACQUIRED") }
  const candidates = events.map((event) => createBoundedFundingCandidate(event, options.controlPlane?.unitId ?? `funding-unit:${options.request.requestIdentity}`, manifest.objectId, options.retrievedAt))
  const registry = new ProductionNormalizerRegistry()
  const commands = candidates.map((candidate) => registry.normalize({ candidate, rawObject: manifest, datasetRegistrySnapshotId: "d3-phase3-funding-dataset-registry-v1", providerRegistrySnapshotId: `mvp-bounded-funding-provider:${BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION}`, providerCertificationSnapshotId: "mvp-bounded-funding-certification-v1", policyVersionId: "mvp-bounded-funding-policy-v1", schemaVersion: "1.0.0", normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: manifest.objectId }))
  if (options.controlPlane) { await options.controlPlane.store.assertFence(options.controlPlane.leaseKey, options.controlPlane.ownerId, options.controlPlane.fencingToken); await options.controlPlane.store.transitionUnit(options.controlPlane.unitId, "NORMALIZED"); await options.controlPlane.store.writeCheckpoint(options.controlPlane.unitId, { stage: "NORMALIZED", candidateIdentities: candidates.map((value) => value.candidateId) }) }
  const canonicalCommitResults: { candidateId: string; status: string; canonicalRecordId: string | null }[] = []
  let duplicateCount = 0, conflictCount = 0
  for (let index = 0; index < commands.length; index += 1) {
    if (options.controlPlane) await options.controlPlane.store.assertFence(options.controlPlane.leaseKey, options.controlPlane.ownerId, options.controlPlane.fencingToken)
    const result = await options.canonicalPort.execute(commands[index])
    if (result.status === "DUPLICATE") duplicateCount += 1
    if (result.status === "CONFLICT" || result.status === "REJECTED") conflictCount += 1
    canonicalCommitResults.push(Object.freeze({ candidateId: candidates[index].candidateId, status: result.status, canonicalRecordId: result.status === "SUCCESS" ? result.fact.canonicalRecordId : result.status === "DUPLICATE" ? result.canonicalRecordId : null }))
  }
  if (conflictCount) return finish({ rawArtifactIdentity: artifact.rawObjectId, candidateIdentities: candidates.map((value) => value.candidateId), canonicalCommitResults, sourceObservedThrough: events.at(-1)?.providerEventTimestamp ?? null, finalizedThrough: options.request.eventTimeEnd, eventCount: events.length, duplicateCount, conflictCount, malformedCount: 0, coverageState: "INCONSISTENT", limitations: ["CANONICAL_CONFLICT"], status: "CANONICAL_CONFLICT" })
  if (options.controlPlane) {
    await options.controlPlane.store.transitionUnit(options.controlPlane.unitId, "COMMITTED")
    await options.controlPlane.store.writeCheckpoint(options.controlPlane.unitId, { stage: "COMMITTED", canonicalCommitResults })
    await options.controlPlane.store.transitionUnit(options.controlPlane.unitId, "VALIDATED")
    await options.controlPlane.store.recordFundingObservation({ unitId: options.controlPlane.unitId, provider: options.request.provider, instrument: options.request.instrument, intervalStart: options.request.eventTimeStart, intervalEnd: options.request.eventTimeEnd, observedThrough: events.at(-1)?.providerEventTimestamp ?? null, finalizedThrough: options.request.eventTimeEnd, sourceChecksum: contentHash, eventCount: events.length, coverageState: "COMPLETE", recordedAt: options.retrievedAt })
    await options.controlPlane.store.transitionUnit(options.controlPlane.unitId, "COMPLETE")
    await options.controlPlane.store.writeCheckpoint(options.controlPlane.unitId, { stage: "COMPLETE", sourceChecksum: contentHash, eventCount: events.length })
  }
  const status = duplicateCount === events.length ? "DUPLICATE" : "CREATED"
  return finish({ rawArtifactIdentity: artifact.rawObjectId, candidateIdentities: candidates.map((value) => value.candidateId), canonicalCommitResults, sourceObservedThrough: events.at(-1)?.providerEventTimestamp ?? null, finalizedThrough: options.request.eventTimeEnd, eventCount: events.length, duplicateCount, conflictCount: 0, malformedCount: 0, coverageState: "COMPLETE", limitations: [], status })
}

export function fundingMandatoryWatermark(results: readonly BoundedFundingRefreshResult[]): string | null {
  if (results.length !== MVP_FUNDING_INSTRUMENTS.length) return null
  const successful = new Map(results.map((result) => [result.requestIdentity, result]))
  if (successful.size !== results.length || results.some((result) => !["CREATED", "DUPLICATE"].includes(result.status) || result.coverageState !== "COMPLETE" || result.conflictCount || result.malformedCount || !result.sourceObservedThrough)) return null
  return results.map((result) => result.finalizedThrough).sort()[0] ?? null
}
