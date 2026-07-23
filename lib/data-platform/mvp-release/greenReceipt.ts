import { canonicalChecksum } from "@/lib/data-platform/contracts"

export const MVP_GREEN_STAGE_RECEIPT_SCHEMA_VERSION = "mvp-green-stage-receipt/1.0.0" as const

export type MvpGreenStageState = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "NOT_APPLICABLE"

export const MVP_GREEN_CERTIFICATION_STAGES = Object.freeze([
  "parentInspection",
  "sourceBoundary",
  "branchCreation",
  "databaseCreation",
  "migrations",
  "jobInitialization",
  "acquisition",
  "corpusConstruction",
  "freeze",
  "certification",
  "readerVerification",
  "preview",
] as const)

export type MvpGreenStage = typeof MVP_GREEN_CERTIFICATION_STAGES[number]

export interface MvpGreenStageResult {
  readonly stage: MvpGreenStage
  readonly state: MvpGreenStageState
  readonly code: string
}

export interface MvpGreenStageReceipt {
  readonly schemaVersion: typeof MVP_GREEN_STAGE_RECEIPT_SCHEMA_VERSION
  readonly mode: "GREEN_CERTIFICATION_ONLY"
  readonly results: readonly MvpGreenStageResult[]
  readonly terminalStage: MvpGreenStage | null
  readonly receiptChecksum: string
}

const CODE = /^[A-Z][A-Z0-9_]{2,80}$/

export function createMvpGreenStageReceipt(input: {
  readonly outcomes: Partial<Record<MvpGreenStage, Readonly<{ state: "PASS" | "FAIL" | "BLOCKED"; code: string }>>>
}): MvpGreenStageReceipt {
  let stopped = false
  let terminalStage: MvpGreenStage | null = null
  const results = MVP_GREEN_CERTIFICATION_STAGES.map((stage): MvpGreenStageResult => {
    if (stage === "preview") {
      return Object.freeze({ stage, state: "NOT_APPLICABLE" as const, code: "CERTIFICATION_ONLY_MODE" })
    }
    const outcome = input.outcomes[stage]
    if (stopped || !outcome) {
      return Object.freeze({ stage, state: "NOT_RUN" as const, code: "EARLIER_STAGE_NOT_COMPLETED" })
    }
    if (!CODE.test(outcome.code)) throw new Error("MVP_GREEN_STAGE_CODE_INVALID")
    if (outcome.state !== "PASS") {
      stopped = true
      terminalStage = stage
    }
    return Object.freeze({ stage, state: outcome.state, code: outcome.code })
  })
  const basis = {
    schemaVersion: MVP_GREEN_STAGE_RECEIPT_SCHEMA_VERSION,
    mode: "GREEN_CERTIFICATION_ONLY" as const,
    results,
    terminalStage,
  }
  return Object.freeze({ ...basis, results: Object.freeze(results), receiptChecksum: canonicalChecksum(basis) })
}

export function assertMvpGreenStageReceiptSanitized(receipt: MvpGreenStageReceipt): void {
  const serialized = JSON.stringify(receipt)
  if (
    /postgres(?:ql)?:\/\//i.test(serialized)
    || /authorization/i.test(serialized)
    || /password/i.test(serialized)
    || /api[_-]?key/i.test(serialized)
    || /[a-z0-9.-]+\.neon\.tech/i.test(serialized)
  ) {
    throw new Error("MVP_GREEN_STAGE_RECEIPT_SECRET_LIKE_VALUE")
  }
}
