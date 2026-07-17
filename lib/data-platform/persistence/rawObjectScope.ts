import { normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { RawObjectManifest } from "./contracts"

export type RawObjectIntervalPolicy = "CONTAINED" | "EXACT"

export interface RawObjectScopeInput {
  readonly datasetId: string
  readonly providerId: string
  readonly providerSnapshotId: string
  readonly instrument: string
  readonly sourceContractVersion: string
  readonly expectedSourceContractVersion: string
  readonly intervalStart: string
  readonly intervalEnd: string | null
  readonly intervalPolicy: RawObjectIntervalPolicy
  readonly rawObject: RawObjectManifest
}

function timestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function validateRawObjectScope(input: RawObjectScopeInput): readonly string[] {
  const errors: string[] = []
  const raw = input.rawObject
  if (raw.datasetId !== input.datasetId) errors.push("RAW_OBJECT_SOURCE_MISMATCH")
  if (raw.providerSnapshotId !== input.providerSnapshotId) errors.push("RAW_OBJECT_PROVIDER_SNAPSHOT_MISMATCH")
  if (normalizeIdentifier(raw.symbolOrSubject ?? "") !== normalizeIdentifier(input.instrument)) errors.push("RAW_OBJECT_SCOPE_MISMATCH")
  if (!input.sourceContractVersion || input.sourceContractVersion !== input.expectedSourceContractVersion) errors.push("SOURCE_CONTRACT_MISMATCH")

  const rawStart = timestamp(raw.windowStart), rawEnd = timestamp(raw.windowEnd), childStart = timestamp(input.intervalStart), childEnd = input.intervalEnd === null ? childStart : timestamp(input.intervalEnd)
  if (rawStart === null || rawEnd === null || childStart === null || childEnd === null || rawEnd <= rawStart || childEnd < childStart) {
    errors.push("RAW_OBJECT_WINDOW_INVALID")
  } else {
    const pointObservation = input.intervalEnd === null || childEnd === childStart
    const contained = childStart >= rawStart && (pointObservation ? childStart < rawEnd : childEnd <= rawEnd)
    if (!contained) errors.push("RAW_OBJECT_WINDOW_NOT_CONTAINED")
    if (input.intervalPolicy === "EXACT" && (normalizeIsoTimestamp(raw.windowStart!) !== normalizeIsoTimestamp(input.intervalStart) || input.intervalEnd === null || normalizeIsoTimestamp(raw.windowEnd!) !== normalizeIsoTimestamp(input.intervalEnd))) errors.push("RAW_OBJECT_WINDOW_MISMATCH")
  }
  return Object.freeze([...new Set(errors)])
}
