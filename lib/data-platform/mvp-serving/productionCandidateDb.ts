import { canonicalChecksum } from "@/lib/data-platform/contracts"

import type { InactiveServingCandidateReview } from "./inactiveStaging"
import {
  MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP8V_APPROVED_CANDIDATE_ID,
  MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP8Z2_CANDIDATE_TARGET_ID,
} from "./preview"
import { MVP8Z_PRODUCTION_PROJECT_ID } from "./runtimeSelection"

export const MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE = "EXACT_CANDIDATE_DB_CUTOVER" as const
export const MVP8Z3_PRODUCTION_CANDIDATE_BRANCH_ID = "br-flat-grass-ao9rtnyr" as const
export const MVP8Z3_PRODUCTION_CANDIDATE_DATABASE = "neondb" as const
export const MVP8Z3_PRODUCTION_CANDIDATE_ROLE = "mvp_serving_reader" as const

export interface MvpServingProductionCandidateDbConfig {
  readonly mode: typeof MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE
  readonly connectionString: string
  readonly targetId: typeof MVP8Z2_CANDIDATE_TARGET_ID
  readonly branchId: typeof MVP8Z3_PRODUCTION_CANDIDATE_BRANCH_ID
  readonly database: typeof MVP8Z3_PRODUCTION_CANDIDATE_DATABASE
  readonly role: typeof MVP8Z3_PRODUCTION_CANDIDATE_ROLE
  readonly candidateId: typeof MVP8V_APPROVED_CANDIDATE_ID
  readonly candidateChecksum: typeof MVP8V_APPROVED_CANDIDATE_CHECKSUM
  readonly memberSetChecksum: typeof MVP8V_APPROVED_MEMBER_SET_CHECKSUM
  readonly commonWatermarkChecksum: typeof MVP8V_APPROVED_WATERMARK_CHECKSUM
}

const invalid = (value: string | undefined): boolean => !value || /[*,]/.test(value)

export function resolveMvpServingProductionCandidateDb(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MvpServingProductionCandidateDbConfig | null {
  const mode = environment.MVP_SERVING_PRODUCTION_CANDIDATE_DB_MODE
  if (!mode) return null
  if (mode !== MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_MODE_INVALID")
  if (environment.VERCEL_ENV !== "production" || environment.MVP_SERVING_VERCEL_PROJECT_ID !== MVP8Z_PRODUCTION_PROJECT_ID) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_ENVIRONMENT_INVALID")
  if (environment.MVP_SERVING_PREVIEW_CANDIDATE_MODE || ![undefined, "ACTIVE_ONLY"].includes(environment.MVP_SERVING_RUNTIME_SELECTION_POLICY)) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_POLICY_CONFLICT")

  const connectionString = environment.MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL
  const values = {
    targetId: environment.MVP_SERVING_PRODUCTION_CANDIDATE_TARGET_ID,
    candidateId: environment.MVP_SERVING_PRODUCTION_CANDIDATE_ID,
    candidateChecksum: environment.MVP_SERVING_PRODUCTION_CANDIDATE_CHECKSUM,
    memberSetChecksum: environment.MVP_SERVING_PRODUCTION_MEMBER_SET_CHECKSUM,
    commonWatermarkChecksum: environment.MVP_SERVING_PRODUCTION_COMMON_WATERMARK_CHECKSUM,
  }
  if (!connectionString || Object.values(values).some(invalid)) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_BINDING_INVALID")
  if (
    values.targetId !== MVP8Z2_CANDIDATE_TARGET_ID ||
    values.candidateId !== MVP8V_APPROVED_CANDIDATE_ID ||
    values.candidateChecksum !== MVP8V_APPROVED_CANDIDATE_CHECKSUM ||
    values.memberSetChecksum !== MVP8V_APPROVED_MEMBER_SET_CHECKSUM ||
    values.commonWatermarkChecksum !== MVP8V_APPROVED_WATERMARK_CHECKSUM
  ) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_BINDING_MISMATCH")
  if (connectionString === environment.MVP_SERVING_POSTGRES_URL || connectionString === environment.DATABASE_URL) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_FALLBACK_FORBIDDEN")

  let url: URL
  try { url = new URL(connectionString) } catch { throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_URL_INVALID") }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  const role = decodeURIComponent(url.username)
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    database !== MVP8Z3_PRODUCTION_CANDIDATE_DATABASE ||
    role !== MVP8Z3_PRODUCTION_CANDIDATE_ROLE ||
    !url.password ||
    !/(?:^|-)pooler\./.test(url.hostname) ||
    !url.hostname.endsWith(".neon.tech") ||
    url.searchParams.get("sslmode") !== "require"
  ) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_URL_UNSAFE")

  return Object.freeze({
    mode: MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE,
    connectionString,
    targetId: MVP8Z2_CANDIDATE_TARGET_ID,
    branchId: MVP8Z3_PRODUCTION_CANDIDATE_BRANCH_ID,
    database: MVP8Z3_PRODUCTION_CANDIDATE_DATABASE,
    role: MVP8Z3_PRODUCTION_CANDIDATE_ROLE,
    candidateId: MVP8V_APPROVED_CANDIDATE_ID,
    candidateChecksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
    memberSetChecksum: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
    commonWatermarkChecksum: MVP8V_APPROVED_WATERMARK_CHECKSUM,
  })
}

export function verifyMvpServingProductionCandidateDbReview(
  review: InactiveServingCandidateReview,
  config: MvpServingProductionCandidateDbConfig,
): void {
  if (
    review.candidateId !== config.candidateId ||
    review.servingChecksum !== config.candidateChecksum ||
    review.memberSetChecksum !== config.memberSetChecksum ||
    review.commonWatermarkChecksum !== config.commonWatermarkChecksum
  ) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_CHECKSUM_MISMATCH")
  if (
    review.counts.projections !== 62 ||
    review.counts.evidenceSummaries !== 6 ||
    review.counts.replaySnapshots !== 6 ||
    review.counts.members !== 74 ||
    review.lifecycle !== "WITHHELD" ||
    review.exposure !== "INTERNAL_ONLY" ||
    review.exposureCount !== 0
  ) throw new Error("SERVING_PRODUCTION_CANDIDATE_DB_STATE_INVALID")
}

export function mvpServingProductionCandidateReadAuthorizationId(config: MvpServingProductionCandidateDbConfig): string {
  return `mvp8z3-production-candidate-read:${canonicalChecksum({
    mode: config.mode,
    targetId: config.targetId,
    candidateId: config.candidateId,
    candidateChecksum: config.candidateChecksum,
    memberSetChecksum: config.memberSetChecksum,
    commonWatermarkChecksum: config.commonWatermarkChecksum,
  })}`
}
