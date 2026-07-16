import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpRefreshPostgresClient } from "./client"
import { createRefreshPlan, createRefreshPolicy, MVP_REFRESH_INSTRUMENTS, MVP_REFRESH_MANDATORY_DATASETS, resolveNextEligibleWindow, type RefreshPlan } from "./contracts"
import { MvpRefreshStore, type RefreshUnitInput } from "./store"

export const ACTIVE_MVP_SERVING_BASELINE = Object.freeze({
  corpusId: "mvp-serving-corpus:129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949",
  servingChecksum: "129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949",
  governedThrough: "2026-07-15T00:00:00.000Z",
  counts: Object.freeze({ projections: 870, evidenceSummaries: 84, replaySnapshots: 84, demoProfiles: 2, releaseInventory: 3, activeExposures: 1 }),
})

export const DEFAULT_MVP_REFRESH_POLICY = createRefreshPolicy({ policyVersion: "mvp-refresh-policy/1.0.0", finalizationDelayMinutes: 120, overlapHours: 1, maximumCatchupDays: 7, maximumRetries: 3, leaseSeconds: 300 })

export const MVP_REFRESH_SOURCE_AUDIT = Object.freeze([
  Object.freeze({ datasetId: "ohlcv", sourceId: "binance-vision-klines", boundedAcquisition: true, canonicalCommit: true, blocker: null, requiresAvailability: true, cadence: "5m" }),
  Object.freeze({ datasetId: "open-interest", sourceId: "binance-vision-open-interest", boundedAcquisition: true, canonicalCommit: true, blocker: null, requiresAvailability: true, cadence: "5m" }),
  Object.freeze({ datasetId: "funding", sourceId: "binance-official-rest-funding-rate", boundedAcquisition: true, canonicalCommit: true, blocker: null, requiresAvailability: true, cadence: "provider-native-discrete" }),
  Object.freeze({ datasetId: "agg-trade", sourceId: "binance-vision-agg-trades", boundedAcquisition: true, canonicalCommit: true, blocker: null, requiresAvailability: true, cadence: "event" }),
  Object.freeze({ datasetId: "macro", sourceId: "fred-dgs10", boundedAcquisition: true, canonicalCommit: true, blocker: null, cadence: "daily-supplemental" }),
  Object.freeze({ datasetId: "daily-market-context", sourceId: "alpha-vantage-spy", boundedAcquisition: true, canonicalCommit: true, blocker: null, cadence: "daily-supplemental" }),
  Object.freeze({ datasetId: "etf-flow", sourceId: "farside-bitcoin-etf", boundedAcquisition: true, canonicalCommit: true, blocker: null, cadence: "daily-supplemental" }),
])

export function planNextMvpRefresh(now = new Date().toISOString()): RefreshPlan | null {
  const window = resolveNextEligibleWindow({ activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, now, finalizationDelayMinutes: DEFAULT_MVP_REFRESH_POLICY.finalizationDelayMinutes, overlapHours: DEFAULT_MVP_REFRESH_POLICY.overlapHours })
  return window ? createRefreshPlan({ policy: DEFAULT_MVP_REFRESH_POLICY, activeCorpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId, activeServingChecksum: ACTIVE_MVP_SERVING_BASELINE.servingChecksum, activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, window }) : null
}

export function createRefreshUnits(plan: RefreshPlan, runId: string): readonly RefreshUnitInput[] {
  return Object.freeze(MVP_REFRESH_INSTRUMENTS.flatMap((instrument) => MVP_REFRESH_MANDATORY_DATASETS.map((datasetId) => {
    const basis = { runId, instrument, datasetId, intervalStart: plan.window.requestedStart, intervalEnd: plan.window.requestedEnd }
    const checksum = canonicalChecksum(basis)
    return Object.freeze({ unitId: `mru_${checksum}`, ...basis, checksum })
  })))
}

export async function runInitialBoundedRefresh(client: MvpRefreshPostgresClient, now = new Date().toISOString(), sourceReadiness: "SOURCE_NOT_FINALIZED" | "READY_FOR_ACQUISITION" = "SOURCE_NOT_FINALIZED"): Promise<object> {
  const store = new MvpRefreshStore(client)
  const plan = planNextMvpRefresh(now)
  if (!plan) return Object.freeze({ status: "NOOP", reason: "NO_CLOSED_WINDOW_AVAILABLE", productionMutation: false })
  if (sourceReadiness !== "READY_FOR_ACQUISITION") return Object.freeze({ status: "BLOCKED", reason: "SOURCE_NOT_FINALIZED", timeState: "TIME_ELIGIBLE", sourceState: "SOURCE_NOT_FINALIZED", acquisitionState: "NOT_READY_FOR_ACQUISITION", requestedStart: plan.window.requestedStart, requestedEnd: plan.window.requestedEnd, refreshUnitsCreated: 0, acquisitionStarted: false, candidateGenerated: false, productionMutation: false })
  await store.putPolicy(DEFAULT_MVP_REFRESH_POLICY)
  await store.putPlan(plan)
  const runChecksum = canonicalChecksum({ schemaVersion: "mvp-refresh-run/1.0.0", planId: plan.planId })
  const runId = `mrr_${runChecksum}`
  const runInsert = await store.putRun(runId, plan.planId, runChecksum)
  if (runInsert === "DUPLICATE") return Object.freeze({ status: "DUPLICATE", runId, planId: plan.planId, productionMutation: false })
  const units = createRefreshUnits(plan, runId)
  await store.putUnits(units)
  await store.transitionRun(runId, "ACQUIRING")
  const blockersByDataset = new Map<string, string>(MVP_REFRESH_SOURCE_AUDIT.filter((source) => source.blocker).map((source) => [source.datasetId, source.blocker as string]))
  const blockedUnits = units.filter((unit) => blockersByDataset.has(unit.datasetId))
  for (const unit of blockedUnits) await store.transitionUnit(unit.unitId, "BLOCKED", [blockersByDataset.get(unit.datasetId)!])
  const blockerReasonCodes = Object.freeze([...new Set(blockedUnits.map((unit) => blockersByDataset.get(unit.datasetId)!))])
  await store.transitionRun(runId, "BLOCKED", blockerReasonCodes)
  return Object.freeze({ status: "BLOCKED", runId, planId: plan.planId, requestedStart: plan.window.requestedStart, requestedEnd: plan.window.requestedEnd, unitCount: units.length, blockedUnitCount: blockedUnits.length, blockerReasonCodes, canonicalCommit: "NOT_ATTEMPTED", candidate: "NOT_GENERATED", productionMutation: false })
}
