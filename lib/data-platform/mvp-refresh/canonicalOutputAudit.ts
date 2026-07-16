import { createHash } from "node:crypto"

export type CanonicalPairClassification = "EXACT_CANONICAL_EQUIVALENCE" | "VALUE_EQUIVALENT_IDENTITY_DIFFERENT" | "TRUE_CANONICAL_VALUE_CONFLICT" | "INCOMPLETE_LINEAGE" | "INSUFFICIENT_EVIDENCE"
export type ContractProvenanceClassification = "CONTRACT_PROVENANCE_COMPLETE" | "CONTRACT_PROVENANCE_RECONSTRUCTED" | "CONTRACT_PROVENANCE_PARTIAL" | "CONTRACT_PROVENANCE_UNRECORDED"

export interface StableOhlcvFact {
  readonly canonicalFactIdentity: string
  readonly dataset: "ohlcv"
  readonly instrument: string
  readonly eventTimestamp: string
  readonly interval: string
  readonly open: string
  readonly high: string
  readonly low: string
  readonly close: string
  readonly volume: string
  readonly provider: string | null
  readonly sourceEventIdentity: string | null
  readonly canonicalVersion: number | null
  readonly supersedesIdentity: string | null
  readonly immutablePayloadChecksum: string | null
}

export interface StableOhlcvDigestResult {
  readonly factCount: number
  readonly minTimestamp: string | null
  readonly maxTimestamp: string | null
  readonly timestampSequenceDigest: string
  readonly valueOnlyDigest: string
  readonly fullStableDomainDigest: string
}

export interface StableOhlcvPairComparison {
  readonly classification: CanonicalPairClassification
  readonly independentDigestEqual: boolean
  readonly missingFactIdentities: readonly string[]
  readonly extraFactIdentities: readonly string[]
  readonly timestampDifferences: number
  readonly valueDifferences: number
  readonly metadataDifferences: number
  readonly firstDifferingRow: { readonly identity: string; readonly left: StableOhlcvFact | null; readonly right: StableOhlcvFact | null } | null
  readonly totalDifferingRows: number
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function exactTimestamp(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error("OHLCV_AUDIT_TIMESTAMP_INVALID")
  return value
}

function decimal(value: string): string {
  const normalized = value.trim()
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) throw new Error("OHLCV_AUDIT_DECIMAL_INVALID")
  return normalized
}

function stableFact(fact: StableOhlcvFact): StableOhlcvFact {
  if (!fact.canonicalFactIdentity || fact.dataset !== "ohlcv" || !fact.instrument || !fact.interval) throw new Error("OHLCV_AUDIT_FACT_INVALID")
  return Object.freeze({ ...fact, eventTimestamp: exactTimestamp(fact.eventTimestamp), open: decimal(fact.open), high: decimal(fact.high), low: decimal(fact.low), close: decimal(fact.close), volume: decimal(fact.volume) })
}

export function canonicalizeStableOhlcvFacts(facts: readonly StableOhlcvFact[]): readonly StableOhlcvFact[] {
  const normalized = facts.map(stableFact).sort((left, right) => left.eventTimestamp.localeCompare(right.eventTimestamp) || left.canonicalFactIdentity.localeCompare(right.canonicalFactIdentity))
  const identities = normalized.map((fact) => fact.canonicalFactIdentity)
  if (new Set(identities).size !== identities.length) throw new Error("OHLCV_AUDIT_DUPLICATE_IDENTITY")
  return Object.freeze(normalized)
}

function fullTuple(fact: StableOhlcvFact): readonly unknown[] {
  return Object.freeze([fact.canonicalFactIdentity, fact.dataset, fact.instrument, fact.eventTimestamp, fact.interval, fact.open, fact.high, fact.low, fact.close, fact.volume, fact.provider, fact.sourceEventIdentity, fact.canonicalVersion, fact.supersedesIdentity, fact.immutablePayloadChecksum])
}

function valueTuple(fact: StableOhlcvFact): readonly string[] {
  return Object.freeze([fact.eventTimestamp, fact.interval, fact.open, fact.high, fact.low, fact.close, fact.volume])
}

export function computeStableOhlcvDigests(facts: readonly StableOhlcvFact[]): StableOhlcvDigestResult {
  const ordered = canonicalizeStableOhlcvFacts(facts)
  return Object.freeze({
    factCount: ordered.length,
    minTimestamp: ordered[0]?.eventTimestamp ?? null,
    maxTimestamp: ordered.at(-1)?.eventTimestamp ?? null,
    timestampSequenceDigest: digest(ordered.map((fact) => fact.eventTimestamp)),
    valueOnlyDigest: digest(ordered.map(valueTuple)),
    fullStableDomainDigest: digest(ordered.map(fullTuple)),
  })
}

export function compareStableOhlcvFactSets(leftInput: readonly StableOhlcvFact[] | null, rightInput: readonly StableOhlcvFact[] | null): StableOhlcvPairComparison {
  if (!leftInput || !rightInput) return Object.freeze({ classification: "INSUFFICIENT_EVIDENCE", independentDigestEqual: false, missingFactIdentities: Object.freeze([]), extraFactIdentities: Object.freeze([]), timestampDifferences: 0, valueDifferences: 0, metadataDifferences: 0, firstDifferingRow: null, totalDifferingRows: 0 })
  const left = canonicalizeStableOhlcvFacts(leftInput), right = canonicalizeStableOhlcvFacts(rightInput)
  const leftById = new Map(left.map((fact) => [fact.canonicalFactIdentity, fact])), rightById = new Map(right.map((fact) => [fact.canonicalFactIdentity, fact]))
  const missing = [...leftById.keys()].filter((id) => !rightById.has(id)).sort(), extra = [...rightById.keys()].filter((id) => !leftById.has(id)).sort()
  let timestampDifferences = 0, valueDifferences = 0, metadataDifferences = 0
  const differing: { identity: string; left: StableOhlcvFact | null; right: StableOhlcvFact | null }[] = []
  for (const identity of [...new Set([...leftById.keys(), ...rightById.keys()])].sort()) {
    const a = leftById.get(identity) ?? null, b = rightById.get(identity) ?? null
    if (!a || !b) { differing.push({ identity, left: a, right: b }); continue }
    if (a.eventTimestamp !== b.eventTimestamp || a.interval !== b.interval) timestampDifferences += 1
    if (JSON.stringify(valueTuple(a)) !== JSON.stringify(valueTuple(b))) valueDifferences += 1
    if (JSON.stringify(fullTuple(a).slice(10)) !== JSON.stringify(fullTuple(b).slice(10))) metadataDifferences += 1
    if (JSON.stringify(fullTuple(a)) !== JSON.stringify(fullTuple(b))) differing.push({ identity, left: a, right: b })
  }
  const leftDigest = computeStableOhlcvDigests(left), rightDigest = computeStableOhlcvDigests(right)
  const independentDigestEqual = leftDigest.fullStableDomainDigest === rightDigest.fullStableDomainDigest
  const valueEquivalent = leftDigest.timestampSequenceDigest === rightDigest.timestampSequenceDigest && leftDigest.valueOnlyDigest === rightDigest.valueOnlyDigest
  const classification: CanonicalPairClassification = independentDigestEqual ? "EXACT_CANONICAL_EQUIVALENCE" : valueEquivalent ? "VALUE_EQUIVALENT_IDENTITY_DIFFERENT" : missing.length || extra.length ? "INCOMPLETE_LINEAGE" : valueDifferences || timestampDifferences ? "TRUE_CANONICAL_VALUE_CONFLICT" : "TRUE_CANONICAL_VALUE_CONFLICT"
  return Object.freeze({ classification, independentDigestEqual, missingFactIdentities: Object.freeze(missing), extraFactIdentities: Object.freeze(extra), timestampDifferences, valueDifferences, metadataDifferences, firstDifferingRow: differing[0] ? Object.freeze(differing[0]) : null, totalDifferingRows: differing.length })
}

export function classifyContractProvenance(input: { readonly retrievalIdentity: boolean; readonly artifactIdentity: boolean; readonly candidateIdentity: boolean; readonly canonicalCommitIdentity: boolean; readonly sourceContractVersion: boolean; readonly parserVersion: boolean; readonly normalizationVersion: boolean; readonly repositoryVersion: boolean }): ContractProvenanceClassification {
  const complete = input.retrievalIdentity && input.artifactIdentity && input.candidateIdentity && input.canonicalCommitIdentity && input.sourceContractVersion && input.parserVersion && input.normalizationVersion
  if (complete) return "CONTRACT_PROVENANCE_COMPLETE"
  if (input.sourceContractVersion && input.repositoryVersion && (input.parserVersion || input.normalizationVersion)) return "CONTRACT_PROVENANCE_RECONSTRUCTED"
  if (Object.values(input).some(Boolean)) return "CONTRACT_PROVENANCE_PARTIAL"
  return "CONTRACT_PROVENANCE_UNRECORDED"
}

export async function auditNonRetainedProviderPayload<T>(retrieve: () => Promise<Uint8Array>, inspect: (bytes: Uint8Array) => Promise<T> | T): Promise<{ readonly audit: T; readonly retainedPayload: false }> {
  let bytes: Uint8Array | null = await retrieve()
  try {
    return Object.freeze({ audit: await inspect(bytes), retainedPayload: false })
  } finally {
    bytes = null
  }
}
