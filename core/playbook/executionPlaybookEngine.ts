export type PlaybookSide = "LONG" | "SHORT" | "WAIT"
export type ChecklistStatus = "PASS" | "WATCH" | "FAIL"

export interface ExecutionChecklistItem {
  id: string
  label: string
  status: ChecklistStatus
  detail: string
}

export interface ExecutionPlaybook {
  side: PlaybookSide
  title: string
  confidence: number
  setupQuality: number
  invalidation: string
  trigger: string
  caution: string
  checklist: ExecutionChecklistItem[]
}

function statusScore(status: ChecklistStatus) {
  if (status === "PASS") return 1
  if (status === "WATCH") return 0.45
  return 0
}

export function buildExecutionPlaybook({
  buyPressure = 36,
  sellPressure = 64,
  cvd = -1.2,
  rotationScore = 78,
  liquidityMagnet = 72,
  contradictionPenalty = 14,
}: {
  buyPressure?: number
  sellPressure?: number
  cvd?: number
  rotationScore?: number
  liquidityMagnet?: number
  contradictionPenalty?: number
} = {}): ExecutionPlaybook {
  const sellDominant = sellPressure > buyPressure + 12
  const buyRecovering = buyPressure > sellPressure - 8 && cvd > -0.4
  const rotationStrong = rotationScore >= 72
  const contradictionHigh = contradictionPenalty >= 16
  const liquidityRisk = liquidityMagnet >= 70

  const side: PlaybookSide =
    contradictionHigh || liquidityRisk
      ? "WAIT"
      : rotationStrong && buyRecovering
        ? "LONG"
        : sellDominant
          ? "SHORT"
          : "WAIT"

  const checklist: ExecutionChecklistItem[] = [
    {
      id: "flow-confirmation",
      label: "Flow confirmation",
      status: buyRecovering || sellDominant ? "PASS" : "WATCH",
      detail: buyRecovering
        ? "Buy pressure and CVD are recovering."
        : sellDominant
          ? "Sell pressure remains dominant."
          : "Execution flow is mixed.",
    },
    {
      id: "rotation-confirmation",
      label: "Rotation confirmation",
      status: rotationStrong ? "PASS" : "WATCH",
      detail: rotationStrong
        ? "Rotation engine supports the setup."
        : "Rotation strength is not yet convincing.",
    },
    {
      id: "liquidity-risk",
      label: "Liquidity risk",
      status: liquidityRisk ? "WATCH" : "PASS",
      detail: liquidityRisk
        ? "Nearby liquidity magnet can cause sweep before continuation."
        : "No major liquidity magnet blocking execution.",
    },
    {
      id: "contradiction-filter",
      label: "Contradiction filter",
      status: contradictionHigh ? "FAIL" : contradictionPenalty > 8 ? "WATCH" : "PASS",
      detail: contradictionHigh
        ? "Signals conflict too much for aggressive sizing."
        : contradictionPenalty > 8
          ? "Some disagreement exists. Reduce size."
          : "Signals are sufficiently aligned.",
    },
  ]

  const setupQuality = Math.round(
    (checklist.reduce((sum, item) => sum + statusScore(item.status), 0) / checklist.length) * 100
  )

  const confidence =
    side === "LONG"
      ? Math.min(92, Math.round(48 + rotationScore * 0.28 + buyPressure * 0.18 - contradictionPenalty))
      : side === "SHORT"
        ? Math.min(90, Math.round(45 + sellPressure * 0.32 + Math.max(0, -cvd) * 8 - contradictionPenalty))
        : Math.max(42, Math.round(66 - contradictionPenalty - (liquidityRisk ? 8 : 0)))

  return {
    side,
    title:
      side === "LONG"
        ? "Pullback Long Playbook"
        : side === "SHORT"
          ? "Momentum Short / Fade Playbook"
          : "Wait for Cleaner Trigger",
    confidence,
    setupQuality,
    trigger:
      side === "LONG"
        ? "Enter only after buy imbalance + CVD recovery confirms absorption."
        : side === "SHORT"
          ? "Enter only if sell pressure persists after failed bounce."
          : "Wait for one decisive flow trigger before sizing.",
    invalidation:
      side === "LONG"
        ? "Invalidate if sell pressure expands again or CVD makes a fresh low."
        : side === "SHORT"
          ? "Invalidate if absorption appears and buy pressure reclaims the tape."
          : "No trade while contradiction or liquidity risk remains elevated.",
    caution:
      liquidityRisk
        ? "Liquidity magnet is nearby. Expect sweep behavior before clean direction."
        : contradictionHigh
          ? "Contradiction penalty is high. Protect capital first."
          : "Setup is tradable only with execution confirmation.",
    checklist,
  }
}
