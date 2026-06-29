import {
  SIGNAL_DIRECTIONS,
  type DirectionCorrectness,
  type InvalidationStatus,
  type SignalDirection,
} from "@/lib/signal-evaluation/types"

const DIRECTION_SET = new Set<string>(SIGNAL_DIRECTIONS)

export function isSignalDirection(value: unknown): value is SignalDirection {
  return typeof value === "string" && DIRECTION_SET.has(value)
}

export function directionAdjustedReturn(
  direction: SignalDirection,
  returnPercent: number,
): number | null {
  if (!Number.isFinite(returnPercent) || direction === "NEUTRAL") return null
  return direction === "LONG" ? returnPercent : -returnPercent
}

export function determineDirectionCorrectness(
  direction: SignalDirection,
  returnPercent: number | null,
): DirectionCorrectness {
  if (returnPercent === null || !Number.isFinite(returnPercent) || direction === "NEUTRAL") {
    return null
  }

  const adjusted = directionAdjustedReturn(direction, returnPercent)
  if (adjusted === null || adjusted === 0) return null
  return adjusted > 0
}

export function determineInvalidationStatus(
  direction: SignalDirection,
  invalidationPrice: number | null | undefined,
  observedPrices: readonly number[],
): InvalidationStatus {
  if (direction === "NEUTRAL"
    || invalidationPrice === null
    || invalidationPrice === undefined
    || !Number.isFinite(invalidationPrice)
    || invalidationPrice <= 0
    || observedPrices.length === 0) {
    return null
  }

  return direction === "LONG"
    ? observedPrices.some((price) => price <= invalidationPrice)
    : observedPrices.some((price) => price >= invalidationPrice)
}

