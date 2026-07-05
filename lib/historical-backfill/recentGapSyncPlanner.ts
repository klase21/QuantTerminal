import { createHash } from "node:crypto"

import {
  RECENT_GAP_SYNC_DATASETS,
  type RecentGapSyncCoverageMode,
  type RecentGapSyncDataset,
  type RecentGapSyncJobPlan,
  type RecentGapSyncPlan,
  type RecentGapSyncPlanInput,
  type RecentGapSyncPlanResult,
  type RecentGapSyncProviderStrategy,
  type RecentGapSyncResolution,
} from "@/lib/historical-backfill/recentGapSyncTypes"

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

interface DatasetContract {
  readonly resolution: RecentGapSyncResolution
  readonly coverageMode: RecentGapSyncCoverageMode
  readonly cadenceMs: number | null
  readonly syncPriority: number
  readonly providerStrategy: RecentGapSyncProviderStrategy
  readonly executionSupported: boolean
  readonly executionBlocker: string | null
}

const CONTRACTS: Readonly<Record<RecentGapSyncDataset, DatasetContract>> = Object.freeze({
  HISTORICAL_MARKET: Object.freeze({
    resolution: "5m",
    coverageMode: "time_series",
    cadenceMs: 5 * MINUTE_MS,
    syncPriority: 1,
    providerStrategy: "BINANCE_VISION_ARCHIVE",
    executionSupported: false,
    executionBlocker: "Existing Market runners are fixed-week or full-history and cannot execute a bounded recent gap.",
  }),
  HISTORICAL_FUNDING: Object.freeze({
    resolution: "8h_event",
    coverageMode: "event",
    cadenceMs: 8 * HOUR_MS,
    syncPriority: 2,
    providerStrategy: "BINANCE_OFFICIAL_REST_RECENT_GAP",
    executionSupported: true,
    executionBlocker: null,
  }),
  HISTORICAL_OPEN_INTEREST: Object.freeze({
    resolution: "5m",
    coverageMode: "time_series",
    cadenceMs: 5 * MINUTE_MS,
    syncPriority: 3,
    providerStrategy: "BINANCE_VISION_ARCHIVE",
    executionSupported: true,
    executionBlocker: null,
  }),
  HISTORICAL_AGG_TRADE: Object.freeze({
    resolution: "tick",
    coverageMode: "event_stream",
    cadenceMs: null,
    syncPriority: 4,
    providerStrategy: "BINANCE_VISION_ARCHIVE",
    executionSupported: true,
    executionBlocker: null,
  }),
  HISTORICAL_LIQUIDATION: Object.freeze({
    resolution: "5m",
    coverageMode: "time_series_experimental",
    cadenceMs: 5 * MINUTE_MS,
    syncPriority: 5,
    providerStrategy: "BINANCE_VISION_THEN_EXPLICIT_EXPERIMENTAL",
    executionSupported: true,
    executionBlocker: null,
  }),
})

function canonicalTimestamp(value: string): string | null {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function alignedTarget(target: number, contract: DatasetContract, latest: number | null): number {
  if (contract.resolution === "tick") return target
  if (latest !== null && contract.cadenceMs !== null) {
    return latest + Math.floor((target - latest) / contract.cadenceMs) * contract.cadenceMs
  }
  return Math.floor(target / (contract.cadenceMs ?? 1)) * (contract.cadenceMs ?? 1)
}

function nextMissingTimestamp(latest: number | null, contract: DatasetContract): number | null {
  if (latest === null) return null
  if (contract.resolution !== "tick") return latest + (contract.cadenceMs ?? 0)
  const nextDay = Date.parse(`${new Date(latest + DAY_MS).toISOString().slice(0, 10)}T00:00:00.000Z`)
  return latest >= nextDay - 1_000 ? nextDay : latest + 1
}

function affectedDays(start: number | null, end: number): readonly string[] {
  if (start === null || start > end) return Object.freeze([])
  const days: string[] = []
  let cursor = Date.parse(`${new Date(start).toISOString().slice(0, 10)}T00:00:00.000Z`)
  const last = Date.parse(`${new Date(end).toISOString().slice(0, 10)}T00:00:00.000Z`)
  while (cursor <= last) {
    days.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += DAY_MS
  }
  return Object.freeze(days)
}

function jobId(input: {
  readonly dataset: RecentGapSyncDataset
  readonly symbol: string
  readonly start: string | null
  readonly end: string
}) {
  const digest = createHash("sha256")
    .update([input.dataset, input.symbol, input.start ?? "UNAVAILABLE", input.end].join("|"))
    .digest("hex")
    .slice(0, 24)
  return `recent-gap-sync-v1:${input.dataset}:${input.symbol}:${digest}`
}

export function planRecentGapSync(input: RecentGapSyncPlanInput): RecentGapSyncPlanResult {
  const symbol = input.symbol.trim().toUpperCase()
  const targetEndTime = canonicalTimestamp(input.targetEndTime)
  const datasets = input.datasets ?? RECENT_GAP_SYNC_DATASETS
  const errors: string[] = []
  if (!/^[A-Z0-9]{5,24}$/.test(symbol)) errors.push("symbol must be a canonical market symbol.")
  if (!targetEndTime) errors.push("targetEndTime must be a valid explicit timestamp.")
  if (!datasets.length || new Set(datasets).size !== datasets.length
    || datasets.some((dataset) => !RECENT_GAP_SYNC_DATASETS.includes(dataset))) {
    errors.push("datasets must be a non-empty unique subset of the canonical sync datasets.")
  }
  if (errors.length || !targetEndTime) {
    return Object.freeze({ status: "VALIDATION_ERROR", errors: Object.freeze(errors) })
  }

  const target = Date.parse(targetEndTime)
  const jobs: RecentGapSyncJobPlan[] = []
  for (const dataset of datasets) {
    const contract = CONTRACTS[dataset]
    const rawLatest = input.latestObservedAt[dataset]
    const latest = typeof rawLatest === "string" ? canonicalTimestamp(rawLatest) : null
    if (rawLatest !== null && rawLatest !== undefined && !latest) {
      errors.push(`${dataset} latestObservedAt is invalid.`)
      continue
    }
    const latestMs = latest ? Date.parse(latest) : null
    const endMs = alignedTarget(target, contract, latestMs)
    const startMs = nextMissingTimestamp(latestMs, contract)
    if (latestMs !== null && latestMs > target) {
      errors.push(`${dataset} latestObservedAt is after targetEndTime.`)
      continue
    }
    const missingStartMs = startMs !== null && startMs <= endMs ? startMs : null
    const missingWindowStart = missingStartMs === null ? null : new Date(missingStartMs).toISOString()
    const missingWindowEnd = new Date(endMs).toISOString()
    const estimatedMissingRecords = contract.cadenceMs === null || missingStartMs === null
      ? null
      : Math.floor((endMs - missingStartMs) / contract.cadenceMs) + 1
    jobs.push(Object.freeze({
      jobId: jobId({ dataset, symbol, start: missingWindowStart, end: missingWindowEnd }),
      dataset,
      symbol,
      latestObservedAt: latest,
      targetEndTime,
      resolution: contract.resolution,
      coverageMode: contract.coverageMode,
      missingWindowStart,
      missingWindowEnd,
      estimatedMissingRecords,
      syncPriority: contract.syncPriority,
      providerStrategy: contract.providerStrategy,
      affectedUtcDays: affectedDays(missingStartMs, endMs),
      executionSupported: contract.executionSupported,
      executionBlocker: contract.executionBlocker,
    }))
  }
  if (errors.length) return Object.freeze({ status: "VALIDATION_ERROR", errors: Object.freeze(errors) })
  jobs.sort((left, right) => left.syncPriority - right.syncPriority)
  const allDays = [...new Set(jobs.flatMap((job) => job.affectedUtcDays))].sort()
  const planIdentity = jobs.map((job) => job.jobId).join("|")
  const planId = `recent-gap-plan-v1:${symbol}:${createHash("sha256").update(planIdentity).digest("hex").slice(0, 24)}`
  const plan: RecentGapSyncPlan = Object.freeze({
    planId,
    symbol,
    targetEndTime,
    jobs: Object.freeze(jobs),
    affectedUtcDays: Object.freeze(allDays),
  })
  return Object.freeze({ status: "SUCCESS", value: plan })
}
