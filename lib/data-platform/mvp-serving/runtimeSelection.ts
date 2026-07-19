import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"

import { MVP8V_APPROVED_CANDIDATE_CHECKSUM, MVP8V_APPROVED_CANDIDATE_ID, MVP8V_PRODUCTION_TARGET_ID } from "./preview"

export const MVP8Z_PRODUCTION_PROJECT_ID = "prj_iAsTeKrqHSh9SA2AXANn9MJ17O6S" as const
export const MVP8Z_OLD_CORPUS_ID = "mvp-serving-corpus:129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949" as const
export const MVP8Z_OLD_CORPUS_CHECKSUM = "129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949" as const
export const MVP8Z_RUNTIME_AUTHORIZATION_ARTIFACT_KEY = "mvp8zRuntimeSelectionPolicy" as const

export type MvpServingRuntimeSelectionPolicyName = "ACTIVE_ONLY" | "CUTOVER_BRIDGE_EXACT_PAIR" | "CANDIDATE_ONLY"

interface CorpusBinding { readonly id: string; readonly checksum: string }
interface RuntimeAuthorizationBinding {
  readonly id: string
  readonly checksum: string
  readonly expiresAt: string
  readonly reviewedCommit: string
  readonly targetId: typeof MVP8V_PRODUCTION_TARGET_ID
  readonly projectId: typeof MVP8Z_PRODUCTION_PROJECT_ID
}

export type MvpServingRuntimeSelectionPolicy =
  | Readonly<{ mode: "ACTIVE_ONLY"; expected: CorpusBinding | null }>
  | Readonly<{ mode: "CUTOVER_BRIDGE_EXACT_PAIR"; old: CorpusBinding; candidate: CorpusBinding; authorization: RuntimeAuthorizationBinding }>
  | Readonly<{ mode: "CANDIDATE_ONLY"; candidate: CorpusBinding; reviewedCommit: string; targetId: typeof MVP8V_PRODUCTION_TARGET_ID; projectId: typeof MVP8Z_PRODUCTION_PROJECT_ID }>

export interface RuntimeSelectionApprovalRecord {
  readonly approval_id: string
  readonly approval_checksum: string
  readonly candidate_id: string
  readonly candidate_checksum: string
  readonly reviewed_commit: string
  readonly review_artifact_checksums: Readonly<Record<string, string>>
  readonly target_fingerprint: string
  readonly expires_at: string | Date
}

const forbidden = (value: string | undefined): boolean => !value || /[*,]/.test(value)
const exactChecksum = (value: string | undefined): value is string => Boolean(value && /^[0-9a-f]{64}$/.test(value))
const exactCommit = (value: string | undefined): value is string => Boolean(value && /^[0-9a-f]{40}$/.test(value))
const atIso = (value: string, code: string): string => { const result = new Date(value).toISOString(); if (result !== value) throw new Error(code); return result }

export function runtimeSelectionAuthorizationArtifactChecksum(input: { readonly reviewedCommit: string; readonly expiresAt: string }): string {
  return canonicalChecksum({
    policy: "CUTOVER_BRIDGE_EXACT_PAIR",
    projectId: MVP8Z_PRODUCTION_PROJECT_ID,
    targetId: MVP8V_PRODUCTION_TARGET_ID,
    reviewedCommit: input.reviewedCommit,
    expiresAt: atIso(input.expiresAt, "SERVING_RUNTIME_AUTHORIZATION_EXPIRY_INVALID"),
    old: { id: MVP8Z_OLD_CORPUS_ID, checksum: MVP8Z_OLD_CORPUS_CHECKSUM },
    candidate: { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM },
  })
}

export function resolveMvpServingRuntimeSelectionPolicy(environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingRuntimeSelectionPolicy {
  const mode = environment.MVP_SERVING_RUNTIME_SELECTION_POLICY ?? "ACTIVE_ONLY"
  if (mode === "ACTIVE_ONLY") {
    const id = environment.MVP_SERVING_EXPECTED_CORPUS_ID, checksum = environment.MVP_SERVING_EXPECTED_CHECKSUM
    if (Boolean(id) !== Boolean(checksum) || id && (forbidden(id) || !exactChecksum(checksum))) throw new Error("SERVING_ACTIVE_ONLY_BINDING_INVALID")
    if (environment.VERCEL_ENV === "production" && !id) throw new Error("SERVING_ACTIVE_ONLY_BINDING_REQUIRED")
    return Object.freeze({ mode, expected: id ? Object.freeze({ id, checksum: checksum! }) : null })
  }
  if (mode !== "CUTOVER_BRIDGE_EXACT_PAIR" && mode !== "CANDIDATE_ONLY") throw new Error("SERVING_RUNTIME_SELECTION_POLICY_INVALID")
  if (environment.VERCEL_ENV !== "production" || environment.MVP_SERVING_VERCEL_PROJECT_ID !== MVP8Z_PRODUCTION_PROJECT_ID || environment.MVP_SERVING_RUNTIME_TARGET_ID !== MVP8V_PRODUCTION_TARGET_ID) throw new Error("SERVING_RUNTIME_PRODUCTION_IDENTITY_INVALID")
  const reviewedCommit = environment.VERCEL_GIT_COMMIT_SHA, configuredCommit = environment.MVP_SERVING_RUNTIME_DEPLOYMENT_COMMIT
  if (!exactCommit(reviewedCommit) || reviewedCommit !== configuredCommit) throw new Error("SERVING_RUNTIME_COMMIT_BINDING_INVALID")
  const candidateId = environment.MVP_SERVING_RUNTIME_CANDIDATE_CORPUS_ID, candidateChecksum = environment.MVP_SERVING_RUNTIME_CANDIDATE_CORPUS_CHECKSUM
  if (candidateId !== MVP8V_APPROVED_CANDIDATE_ID || candidateChecksum !== MVP8V_APPROVED_CANDIDATE_CHECKSUM) throw new Error("SERVING_RUNTIME_CANDIDATE_BINDING_INVALID")
  const candidate = Object.freeze({ id: candidateId, checksum: candidateChecksum })
  if (mode === "CANDIDATE_ONLY") {
    if (environment.MVP_SERVING_RUNTIME_OLD_CORPUS_ID || environment.MVP_SERVING_RUNTIME_OLD_CORPUS_CHECKSUM || environment.MVP_SERVING_RUNTIME_AUTHORIZATION_ID || environment.MVP_SERVING_RUNTIME_AUTHORIZATION_CHECKSUM || environment.MVP_SERVING_RUNTIME_AUTHORIZATION_EXPIRES_AT) throw new Error("SERVING_CANDIDATE_ONLY_BRIDGE_BINDING_FORBIDDEN")
    return Object.freeze({ mode, candidate, reviewedCommit, targetId: MVP8V_PRODUCTION_TARGET_ID, projectId: MVP8Z_PRODUCTION_PROJECT_ID })
  }
  const authorizationId = environment.MVP_SERVING_RUNTIME_AUTHORIZATION_ID, authorizationChecksum = environment.MVP_SERVING_RUNTIME_AUTHORIZATION_CHECKSUM, expiresAt = environment.MVP_SERVING_RUNTIME_AUTHORIZATION_EXPIRES_AT
  if (!/^mvp8s-approval:[0-9a-f]{64}$/.test(authorizationId ?? "") || !exactChecksum(authorizationChecksum) || authorizationId!.slice("mvp8s-approval:".length) !== authorizationChecksum || forbidden(expiresAt)) throw new Error("SERVING_RUNTIME_AUTHORIZATION_BINDING_INVALID")
  const expiry = atIso(expiresAt!, "SERVING_RUNTIME_AUTHORIZATION_EXPIRY_INVALID")
  if (Date.parse(expiry) <= Date.now()) throw new Error("SERVING_RUNTIME_AUTHORIZATION_EXPIRED")
  const authorization = Object.freeze({ id: authorizationId!, checksum: authorizationChecksum, expiresAt: expiry, reviewedCommit, targetId: MVP8V_PRODUCTION_TARGET_ID, projectId: MVP8Z_PRODUCTION_PROJECT_ID })
  const oldId = environment.MVP_SERVING_RUNTIME_OLD_CORPUS_ID, oldChecksum = environment.MVP_SERVING_RUNTIME_OLD_CORPUS_CHECKSUM
  if (oldId !== MVP8Z_OLD_CORPUS_ID || oldChecksum !== MVP8Z_OLD_CORPUS_CHECKSUM) throw new Error("SERVING_BRIDGE_PAIR_BINDING_INVALID")
  return Object.freeze({ mode, old: Object.freeze({ id: oldId, checksum: oldChecksum }), candidate, authorization })
}

export function verifySelectedServingCorpus(policy: MvpServingRuntimeSelectionPolicy, selected: CorpusBinding): void {
  if (policy.mode === "ACTIVE_ONLY") {
    if (policy.expected?.id && policy.expected.id !== selected.id) throw new Error("SERVING_CORPUS_ID_MISMATCH")
    if (policy.expected?.checksum && policy.expected.checksum !== selected.checksum) throw new Error("SERVING_CORPUS_CHECKSUM_MISMATCH")
    return
  }
  const allowed = policy.mode === "CUTOVER_BRIDGE_EXACT_PAIR" ? [policy.old, policy.candidate] : [policy.candidate]
  const binding = allowed.find((value) => value.id === selected.id)
  if (!binding) throw new Error(policy.mode === "CANDIDATE_ONLY" ? "SERVING_CANDIDATE_ONLY_CORPUS_REJECTED" : "SERVING_BRIDGE_CORPUS_REJECTED")
  if (binding.checksum !== selected.checksum) throw new Error("SERVING_CORPUS_CHECKSUM_MISMATCH")
}

export function verifyRuntimeSelectionApproval(policy: Extract<MvpServingRuntimeSelectionPolicy, { mode: "CUTOVER_BRIDGE_EXACT_PAIR" }>, record: RuntimeSelectionApprovalRecord | undefined, at: string): void {
  const now = atIso(at, "SERVING_RUNTIME_AUTHORIZATION_TIME_INVALID")
  const expiresAt = record?.expires_at instanceof Date ? record.expires_at.toISOString() : record?.expires_at ? new Date(record.expires_at).toISOString() : ""
  if (!record || record.approval_id !== policy.authorization.id || record.approval_checksum !== policy.authorization.checksum || record.candidate_id !== MVP8V_APPROVED_CANDIDATE_ID || record.candidate_checksum !== MVP8V_APPROVED_CANDIDATE_CHECKSUM || record.reviewed_commit !== policy.authorization.reviewedCommit || record.target_fingerprint !== policy.authorization.targetId || expiresAt !== policy.authorization.expiresAt || Date.parse(expiresAt) <= Date.parse(now)) throw new Error("SERVING_RUNTIME_AUTHORIZATION_INVALID")
  const wanted = runtimeSelectionAuthorizationArtifactChecksum({ reviewedCommit: policy.authorization.reviewedCommit, expiresAt: policy.authorization.expiresAt })
  if (record.review_artifact_checksums[MVP8Z_RUNTIME_AUTHORIZATION_ARTIFACT_KEY] !== wanted) throw new Error("SERVING_RUNTIME_AUTHORIZATION_ARTIFACT_MISMATCH")
}

export async function verifyRuntimeSelectionPolicyInTransaction(sql: postgres.TransactionSql, policy: MvpServingRuntimeSelectionPolicy, at: string): Promise<void> {
  if (policy.mode === "ACTIVE_ONLY") return
  const target = await sql.unsafe<Array<{ branch_id: string | null }>>("SELECT current_setting('neon.branch_id',true) branch_id")
  if (target[0]?.branch_id !== "br-royal-block-aop70mzq") throw new Error("SERVING_RUNTIME_TARGET_MISMATCH")
  if (policy.mode === "CANDIDATE_ONLY") return
  const rows = await sql.unsafe<RuntimeSelectionApprovalRecord[]>("SELECT approval_id,approval_checksum,candidate_id,candidate_checksum,reviewed_commit,review_artifact_checksums,target_fingerprint,expires_at FROM serving_control.cutover_approval WHERE approval_id=$1", [policy.authorization.id])
  verifyRuntimeSelectionApproval(policy, rows[0], at)
}
