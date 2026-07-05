import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { HistoricalProviderMetadataTargetKind } from "@/lib/persistence/repository/types"
import type { ProjectionReadStatus } from "@/lib/historical-backfill/projectionLifecycle"

export const PROVIDER_AVAILABILITY_STATUSES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "UNKNOWN",
  "NOT_CHECKED",
] as const

export type ProviderAvailabilityStatus = typeof PROVIDER_AVAILABILITY_STATUSES[number]

const PROVIDER_AVAILABILITY_STATUS_SET = new Set<string>(PROVIDER_AVAILABILITY_STATUSES)

export function isProviderAvailabilityStatus(
  value: unknown,
): value is ProviderAvailabilityStatus {
  return typeof value === "string" && PROVIDER_AVAILABILITY_STATUS_SET.has(value)
}

export interface RepositoryProviderAvailability {
  readonly status: ProviderAvailabilityStatus
  readonly reason: string
}

export interface ProjectionRepositoryHealth {
  readonly ready: boolean
  readonly degraded: boolean
  readonly reason: string
}

export function evaluateProjectionRepositoryHealth(
  status: ProjectionReadStatus,
): ProjectionRepositoryHealth {
  if (status === "AVAILABLE") {
    return Object.freeze({ ready: true, degraded: false, reason: "Projection is available and current." })
  }
  if (status === "STALE") {
    return Object.freeze({ ready: true, degraded: true, reason: "Projection is readable but recomputation is required." })
  }
  return Object.freeze({ ready: false, degraded: true, reason: "Projection is missing." })
}

function payloadIdentity(payload: unknown): { readonly symbol?: string; readonly sourceId?: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Object.freeze({})
  const value = payload as Record<string, unknown>
  return Object.freeze({
    ...(typeof value.symbol === "string" ? { symbol: value.symbol } : {}),
    ...(typeof value.sourceId === "string" ? { sourceId: value.sourceId } : {}),
  })
}

export async function inspectRepositoryProviderAvailability(input: {
  readonly repository: PersistenceRepository
  readonly datasetKind: HistoricalProviderMetadataTargetKind
  readonly symbol: string
  readonly sourceId: string
}): Promise<RepositoryProviderAvailability> {
  let cursor: string | undefined
  do {
    const page = await input.repository.listStorageRecords({
      recordKinds: [input.datasetKind],
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    })
    if (page.status !== "SUCCESS") {
      return Object.freeze({
        status: page.status === "UNAVAILABLE" ? "UNAVAILABLE" : "UNKNOWN",
        reason: `Repository availability read returned ${page.status}.`,
      })
    }
    for (const record of page.value.records) {
      const identity = payloadIdentity(record.payload)
      if (identity.symbol === input.symbol && identity.sourceId === input.sourceId) {
        return Object.freeze({
          status: "AVAILABLE",
          reason: "Repository contains source-backed history for this provider and symbol.",
        })
      }
    }
    cursor = page.value.nextCursor ?? undefined
  } while (cursor)
  return Object.freeze({
    status: "UNKNOWN",
    reason: "Repository contains no matching source-backed history; external availability was not checked.",
  })
}
