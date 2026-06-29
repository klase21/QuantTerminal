import { directionAdjustedReturn } from "@/lib/signal-evaluation/direction"
import type {
  SignalDirection,
  SignalOutcomeStatus,
} from "@/lib/signal-evaluation/types"

export function determineOutcomeStatus(
  direction: SignalDirection,
  returnPercent: number | null,
): SignalOutcomeStatus {
  if (returnPercent === null || !Number.isFinite(returnPercent)) return "UNAVAILABLE"
  if (direction === "NEUTRAL") return returnPercent === 0 ? "FLAT" : "UNAVAILABLE"

  const adjusted = directionAdjustedReturn(direction, returnPercent)
  if (adjusted === null) return "UNAVAILABLE"
  if (adjusted > 0) return "FAVORABLE"
  if (adjusted < 0) return "ADVERSE"
  return "FLAT"
}

