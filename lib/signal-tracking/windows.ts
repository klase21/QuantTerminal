import {
  TRACKING_WINDOW_IDS,
  type TrackingResult,
  type TrackingWindow,
  type TrackingWindowId,
} from "@/lib/signal-tracking/types"

export interface TrackingWindowDefinition {
  readonly id: TrackingWindowId
  readonly durationMs: number
  readonly order: number
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export const CANONICAL_TRACKING_WINDOWS: readonly TrackingWindowDefinition[] =
  Object.freeze([
    Object.freeze({ id: "1h", durationMs: HOUR_MS, order: 0 }),
    Object.freeze({ id: "6h", durationMs: 6 * HOUR_MS, order: 1 }),
    Object.freeze({ id: "24h", durationMs: DAY_MS, order: 2 }),
    Object.freeze({ id: "3d", durationMs: 3 * DAY_MS, order: 3 }),
    Object.freeze({ id: "7d", durationMs: 7 * DAY_MS, order: 4 }),
    Object.freeze({ id: "14d", durationMs: 14 * DAY_MS, order: 5 }),
    Object.freeze({ id: "30d", durationMs: 30 * DAY_MS, order: 6 }),
  ])

const WINDOW_ID_SET = new Set<string>(TRACKING_WINDOW_IDS)
const WINDOW_BY_ID = new Map(
  CANONICAL_TRACKING_WINDOWS.map((definition) => [definition.id, definition]),
)

export function isTrackingWindowId(value: unknown): value is TrackingWindowId {
  return typeof value === "string" && WINDOW_ID_SET.has(value)
}

export function getTrackingWindowDefinition(
  windowId: unknown,
): TrackingResult<TrackingWindowDefinition> {
  if (!isTrackingWindowId(windowId)) {
    return {
      success: false,
      errors: [{
        code: "unknown_window",
        message: `Unknown tracking window: ${String(windowId)}.`,
        field: "window",
      }],
    }
  }

  return { success: true, value: WINDOW_BY_ID.get(windowId)! }
}

export function createCanonicalTrackingWindows(
  createdAt: string,
): TrackingResult<readonly TrackingWindow[]> {
  const createdAtMs = Date.parse(createdAt)
  if (!Number.isFinite(createdAtMs)) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Tracking createdAt must be a valid timestamp.",
        field: "createdAt",
      }],
    }
  }

  const windows = CANONICAL_TRACKING_WINDOWS.map((definition) => Object.freeze({
    id: definition.id,
    durationMs: definition.durationMs,
    dueAt: new Date(createdAtMs + definition.durationMs).toISOString(),
    status: "QUEUED" as const,
    terminalResult: null,
  }))

  return { success: true, value: Object.freeze(windows) }
}

export function orderTrackingWindowIds(
  windowIds: readonly TrackingWindowId[],
): readonly TrackingWindowId[] {
  return Object.freeze([...windowIds].sort((left, right) => (
    WINDOW_BY_ID.get(left)!.order - WINDOW_BY_ID.get(right)!.order
  )))
}

