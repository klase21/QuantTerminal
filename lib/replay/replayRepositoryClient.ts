import type { ReplayCoverageGateResult } from "@/lib/replay/replayCoverageGate"

export const REPLAY_REPOSITORY_DATASETS = [
  "market",
  "open_interest",
  "liquidation",
  "funding",
  "agg_trade",
] as const

export type ReplayRepositoryDataset = typeof REPLAY_REPOSITORY_DATASETS[number]

export interface ReplayRepositoryRecord {
  readonly recordId: string
  readonly observedAt: string
  readonly payload: unknown
}

export interface ReplayRepositoryDatasetResponse {
  readonly ok: true
  readonly symbol: string
  readonly date: string
  readonly hour: number
  readonly dataset: ReplayRepositoryDataset
  readonly source: "repository"
  readonly bounded: true
  readonly records: readonly ReplayRepositoryRecord[]
  readonly count: number
  readonly firstObservedAt: string | null
  readonly lastObservedAt: string | null
  readonly providerTier: string
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
  readonly truncated: boolean
  readonly nextCursor: string | null
  readonly limit: number | null
}

export type ReplayRepositoryClientResult =
  | { readonly status: "SUCCESS"; readonly value: ReplayRepositoryDatasetResponse }
  | { readonly status: "GATE_CLOSED" | "VALIDATION_ERROR" | "UNAVAILABLE"; readonly reason: string }

export async function queryReplayRepositoryDataset(input: {
  readonly gate: ReplayCoverageGateResult
  readonly symbol: string
  readonly utcDay: string
  readonly hour: number
  readonly dataset: ReplayRepositoryDataset
  readonly limit?: number
  readonly cursor?: string
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
}): Promise<ReplayRepositoryClientResult> {
  if (!input.gate.repositoryReady || input.gate.projectionStatus !== "AVAILABLE") {
    return Object.freeze({ status: "GATE_CLOSED", reason: input.gate.degradedReason ?? "Repository coverage gate is closed." })
  }
  if (!/^[A-Z0-9]{5,24}$/.test(input.symbol.trim().toUpperCase())
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.utcDay)
    || !Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23
    || !REPLAY_REPOSITORY_DATASETS.includes(input.dataset)
    || (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit <= 0))) {
    return Object.freeze({ status: "VALIDATION_ERROR", reason: "Replay Repository query is invalid." })
  }
  const params = new URLSearchParams({
    symbol: input.symbol.trim().toUpperCase(),
    date: input.utcDay,
    hour: String(input.hour),
    dataset: input.dataset,
  })
  if (input.limit !== undefined) params.set("limit", String(input.limit))
  if (input.cursor) params.set("cursor", input.cursor)
  try {
    const response = await (input.fetchImpl ?? fetch)(`/api/repository/replay?${params.toString()}`, {
      cache: "no-store",
      signal: input.signal,
    })
    const payload = await response.json() as Partial<ReplayRepositoryDatasetResponse> & { reason?: string }
    if (!response.ok || payload.ok !== true || payload.source !== "repository" || payload.bounded !== true
      || !Array.isArray(payload.records) || typeof payload.count !== "number") {
      return Object.freeze({ status: "UNAVAILABLE", reason: payload.reason ?? "Bounded Replay Repository query is unavailable." })
    }
    return Object.freeze({ status: "SUCCESS", value: payload as ReplayRepositoryDatasetResponse })
  } catch {
    return Object.freeze({ status: "UNAVAILABLE", reason: "Bounded Replay Repository request failed." })
  }
}
