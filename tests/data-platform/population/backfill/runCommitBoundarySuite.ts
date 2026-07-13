import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { CanonicalCommitCommand, RawObjectManifest } from "@/lib/data-platform/persistence"
import type { CanonicalPersistenceAdapter, LatestCanonicalVersionResult } from "@/lib/data-platform/persistence/postgres"
import { createD3ToD2CanonicalCommitPort } from "@/lib/data-platform/population/backfill"
import { inspectDurableD3Target } from "@/lib/data-platform/population/postgres"

let failures = 0
function check(name: string, value: boolean) { if (value) console.log(`PASS ${name}`); else { failures += 1; console.error(`FAIL ${name}`) } }

const raw: RawObjectManifest = { objectId: `raw_${"a".repeat(64)}`, datasetId: "ohlcv", providerId: "binance-public-archive", venue: "BINANCE", symbolOrSubject: "BTCUSDT", windowStart: "2026-07-11T00:00:00.000Z", windowEnd: "2026-07-12T00:00:00.000Z", contentHash: "a".repeat(64), sizeBytes: 1, mediaType: "application/zip", compression: "ZIP", retrievedAt: "2026-07-12T00:00:00.000Z", providerSnapshotId: "provider-snapshot", retentionClass: "ARCHIVE", verificationState: "VERIFIED", objectStorageKey: `raw/aa/${"a".repeat(64)}.zip`, createdAt: "2026-07-12T00:00:00.000Z" }
const fact = { kind: "OHLCV" as const, identity: { datasetId: "ohlcv", businessIdentity: "BINANCE|BTCUSDT|5m|2026-07-11T00:00:00.000Z", canonicalRecordId: `rec_${"b".repeat(64)}` }, providerId: "binance-public-archive", venue: "BINANCE", symbolOrSubject: "BTCUSDT", observedAt: "2026-07-11T00:00:00.000Z", effectiveAt: "2026-07-11T00:00:00.000Z", checksum: "c".repeat(64), governance: { datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-certification", policyVersionId: "ohlcv-policy", schemaVersion: "1.0.0", normalizationVersion: "d3-phase3-normalizer-v1" }, resolution: "5m", open: "1", high: "2", low: "1", close: "2", volume: "3", closeTime: "2026-07-11T00:04:59.999Z" }
const edgeTruth = [raw.objectId, raw.contentHash, fact.identity.canonicalRecordId, 1, "NORMALIZED_FROM"]
const command: CanonicalCommitCommand = { operationType: "INITIAL_VERSION", idempotencyKey: "candidate:test:version:1", initiatedAt: "2026-07-12T00:00:00.000Z", rawObject: raw, fact, targetRecordVersion: 1, predecessor: null, requiredLineage: [{ edgeId: `lin_${canonicalChecksum(edgeTruth)}`, source: { nodeType: "RAW_OBJECT", nodeId: raw.objectId, nodeVersion: raw.contentHash }, destination: { nodeType: "CANONICAL_FACT", nodeId: fact.identity.canonicalRecordId, nodeVersion: "1" }, relationship: "NORMALIZED_FROM", commitId: "commit-placeholder", createdAt: "2026-07-12T00:00:00.000Z", digest: canonicalChecksum(edgeTruth) }] }

function adapter(latest: LatestCanonicalVersionResult, commits: CanonicalCommitCommand[]): CanonicalPersistenceAdapter {
  return { async registerRegistrySnapshot() { throw new Error("NOT_USED") }, async registerProviderSnapshot() { throw new Error("NOT_USED") }, async registerPolicyVersion() { throw new Error("NOT_USED") }, async registerRawObjectManifest() { return { status: "SUCCESS", objectId: raw.objectId } }, async executeCanonicalCommit(next) { commits.push(next); return { status: "DUPLICATE", canonicalRecordId: next.fact.identity.canonicalRecordId, recordVersion: next.targetRecordVersion, checksum: next.fact.checksum } }, async readCanonicalRecordVersion() { return null }, async readLatestCanonicalVersion() { return latest }, async appendPublicationDecision() { throw new Error("NOT_USED") }, async readLineageEdges() { return [] }, async verifyLineageAcyclic() { return true }, async readOutboxEvents() { return [] }, async readQuarantineConflicts() { return [] }, async reconcileCommit() { throw new Error("NOT_USED") } }
}

async function main() {
  check("allowlisted durable D3 target accepted", inspectDurableD3Target("postgres://worker:secret@localhost:55432/quantterminal_d3_backfill").safe)
  check("D3 certification target rejected for durable use", !inspectDurableD3Target("postgres://worker:secret@localhost:55432/quantterminal_d3_isolated").safe)
  check("D2 durable target rejected by D3", !inspectDurableD3Target("postgres://worker:secret@localhost:55432/quantterminal_d2_backfill").safe)
  const metadata = { canonicalRecordId: fact.identity.canonicalRecordId, recordVersion: 1, checksum: fact.checksum, publicationState: "PENDING" as const, commitId: "commit-existing", datasetId: fact.identity.datasetId, businessIdentity: fact.identity.businessIdentity, providerId: fact.providerId, supersessionState: "ACTIVE" as const, registrySnapshotId: "dataset-snapshot", providerSnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-certification", policyVersionId: "ohlcv-policy", schemaVersion: "1.0.0", normalizationVersion: "d3-phase3-normalizer-v1", createdAt: "2026-07-12T00:00:00.000Z" }
  const duplicateCommits: CanonicalCommitCommand[] = []
  const duplicate = await createD3ToD2CanonicalCommitPort(adapter({ status: "FOUND", record: metadata }, duplicateCommits), "ALLOW_PROVIDER_CORRECTION").execute(command)
  check("identical latest record returns duplicate without commit", duplicate.status === "DUPLICATE" && duplicateCommits.length === 0)
  const correctionCommits: CanonicalCommitCommand[] = []
  const correction = await createD3ToD2CanonicalCommitPort(adapter({ status: "FOUND", record: { ...metadata, checksum: "d".repeat(64) } }, correctionCommits), "ALLOW_PROVIDER_CORRECTION").execute(command)
  check("changed governed content plans next correction", correction.status === "DUPLICATE" && correctionCommits[0]?.operationType === "PROVIDER_CORRECTION" && correctionCommits[0]?.targetRecordVersion === 2 && correctionCommits[0]?.predecessor?.recordVersion === 1)
  const blockedCommits: CanonicalCommitCommand[] = []
  const blocked = await createD3ToD2CanonicalCommitPort(adapter({ status: "FOUND", record: { ...metadata, checksum: "d".repeat(64) } }, blockedCommits)).execute(command)
  check("correction requires explicit policy", blocked.status === "REJECTED" && blockedCommits.length === 0)
  const unavailable = await createD3ToD2CanonicalCommitPort(adapter({ status: "TARGET_UNAVAILABLE", reason: "redacted" }, [])).execute(command)
  check("unknown target outcome remains retryable", unavailable.status === "RETRYABLE_FAILURE")
  if (failures) throw new Error(`${failures} D3 commit boundary checks failed`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
