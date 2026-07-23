import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import type { CanonicalCommitResult } from "@/lib/data-platform/persistence"
import type { D3CanonicalCommitPort } from "@/lib/data-platform/population/backfill"
import { executeCanonicalWithReadback } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"
import { fundingCommand } from "@/tests/data-platform/persistence/postgres/fixtures"

async function main() {
  const command = fundingCommand({ suffix: "pipeline-integrity-unit" })
  const found = Object.freeze({
    status: "FOUND" as const,
    record: Object.freeze({
      canonicalRecordId: command.fact.identity.canonicalRecordId,
      recordVersion: command.targetRecordVersion,
      checksum: command.fact.checksum,
      publicationState: "PENDING" as const,
      commitId: "commit-existing",
      datasetId: command.fact.identity.datasetId,
      businessIdentity: command.fact.identity.businessIdentity,
      providerId: command.fact.providerId,
      supersessionState: "ACTIVE" as const,
      registrySnapshotId: command.fact.governance.datasetRegistrySnapshotId,
      providerSnapshotId: command.fact.governance.providerRegistrySnapshotId,
      providerCertificationSnapshotId: command.fact.governance.providerCertificationSnapshotId,
      policyVersionId: command.fact.governance.policyVersionId,
      schemaVersion: command.fact.governance.schemaVersion,
      normalizationVersion: command.fact.governance.normalizationVersion,
      createdAt: command.initiatedAt,
    }),
  })
  const port = (execute: () => Promise<CanonicalCommitResult>, readLatest: D3CanonicalCommitPort["readLatest"]): D3CanonicalCommitPort => Object.freeze({ execute: async () => execute(), readLatest })

  const afterTimeout = await executeCanonicalWithReadback(port(
    async () => { throw new Error("connection interrupted after commit") },
    async () => found,
  ), command)
  assert.equal(afterTimeout.status, "DUPLICATE")

  const afterRetryable = await executeCanonicalWithReadback(port(
    async () => ({ status: "RETRYABLE_FAILURE", code: "CONNECTION_INTERRUPTED", retryWithSameIdempotencyKey: true }),
    async () => found,
  ), command)
  assert.equal(afterRetryable.status, "DUPLICATE")

  const conflict = await executeCanonicalWithReadback(port(
    async () => ({ status: "RETRYABLE_FAILURE", code: "CONNECTION_INTERRUPTED", retryWithSameIdempotencyKey: true }),
    async () => ({ ...found, record: { ...found.record, checksum: "f".repeat(64) } }),
  ), command)
  assert.equal(conflict.status, "REJECTED")

  const unresolved = await executeCanonicalWithReadback(port(
    async () => ({ status: "RETRYABLE_FAILURE", code: "CONNECTION_INTERRUPTED", retryWithSameIdempotencyKey: true }),
    async () => ({ status: "NOT_FOUND" }),
  ), command)
  assert.equal(unresolved.status, "RETRYABLE_FAILURE")

  const bootstrap = await readFile("lib/data-platform/mvp-refresh/liveResumeLocalBootstrap.ts", "utf8")
  const orderedTokens = [
    "inspectIntegratedMvpGovernancePrerequisites",
    "registerRawObjectManifest(value.raw)",
    "persistBoundedAcquisitionResult",
  ]
  let cursor = bootstrap.indexOf("async persistArtifact")
  for (const token of orderedTokens) {
    const next = bootstrap.indexOf(token, cursor)
    assert.ok(next >= cursor, `expected ordered token ${token}`)
    cursor = next + token.length
  }
  cursor = bootstrap.indexOf("async commit(invocation)")
  for (const token of ["prepareCanonicalSubmission", "markCanonicalCommitRequested", "executeCanonicalWithReadback", "recordIntermediateD2Result"]) {
    const next = bootstrap.indexOf(token, cursor)
    assert.ok(next >= cursor, `expected ordered token ${token}`)
    cursor = next + token.length
  }
  assert.ok(bootstrap.indexOf("checkpoint(checkpoint", bootstrap.indexOf("async validate(invocation)")) > cursor)

  const migration = await readFile("lib/data-platform/population/postgres/migrations/005_population_pipeline_integrity.sql", "utf8")
  for (const state of ["SUBMISSION_PREPARED", "D2_COMMIT_REQUESTED", "COMMIT_RESULT_RECONCILED", "POPULATION_OUTCOME_RECORDED", "CHECKPOINT_RECORDED"]) assert.match(migration, new RegExp(state))
  assert.doesNotMatch(migration, /\bUPDATE\s+population\.|\bDELETE\s+FROM\b/i)

  const adapter = await readFile("lib/data-platform/population/postgres/adapter.ts", "utf8")
  assert.doesNotMatch(adapter, /allowExpiredLease/)
  assert.match(adapter, /l\.expires_at>\$\{now\}/)
  assert.match(adapter, /u\.current_fencing_token=\$\{token\}/)

  console.log("MVP PIPELINE INTEGRITY UNIT SUITE: PASS")
  console.log("[PASS] unknown D2 success reconciles by deterministic identity")
  console.log("[PASS] checksum conflict remains rejected")
  console.log("[PASS] unresolved D2 outcome remains retryable and blocks completion")
  console.log("[PASS] provider snapshot, lineage, submission, outcome, checkpoint ordering is explicit")
  console.log("[PASS] additive submission lifecycle migration is append-only")
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
