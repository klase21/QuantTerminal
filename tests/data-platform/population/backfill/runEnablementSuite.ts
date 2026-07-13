import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { buildHistoricalDatasetScope, buildInstrumentLifecycleInventory, createBackfillManifest, createD3ToD2CanonicalCommitPort, createFilesystemObjectStorage, inspectDurablePostgresTarget, inspectFilesystemObjectRoot, planProviderCorrection, ProductionNormalizerRegistry, verifyBackfillManifest } from "@/lib/data-platform/population/backfill"
import { createCandidateId, type PopulationCandidate } from "@/lib/data-platform/population"
import type { RawObjectManifest } from "@/lib/data-platform/persistence"
import type { CanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"

let failures = 0
function check(name: string, value: boolean) { if (!value) { failures += 1; console.error(`FAIL ${name}`) } else console.log(`PASS ${name}`) }
const stream = (value: Uint8Array) => ({ async *[Symbol.asyncIterator]() { yield value } })

async function main() {
  const scope = buildHistoricalDatasetScope()
  check("all registry datasets classified", scope.length === 17)
  check("derived objects excluded", ["research-packet", "evidence-packet", "coverage-projection", "derived-market-intelligence"].every((id) => scope.find((item) => item.datasetId === id)?.status === "EXCLUDED_FROM_SOURCE_BACKFILL"))
  check("control objects excluded", ["population-job", "consistency-result"].every((id) => scope.find((item) => item.datasetId === id)?.classification === "CONTROL_PLANE"))
  check("required provider remains blocked", scope.find((item) => item.datasetId === "macro")?.status === "BLOCKED_REQUIRED_PROVIDER")
  check("required missing target remains blocked", scope.find((item) => item.datasetId === "research-document")?.status === "BLOCKED_REQUIRED_TARGET")

  const instruments = buildInstrumentLifecycleInventory()
  check("six current focus instruments governed", instruments.length === 6 && instruments.every((item) => item.supportStatus === "ACTIVE"))
  check("instrument lifecycle identity deterministic", JSON.stringify(instruments) === JSON.stringify(buildInstrumentLifecycleInventory()))

  const base = { manifestSchemaVersion: "1.0.0" as const, approvalStatus: "BLOCKED" as const, executable: false, frozenCutoffUtc: "2026-07-12T00:00:00.000Z", datasetRegistryVersion: "1.0.0", providerRegistryVersion: "1.0.0", datasets: scope, instruments, partitions: [], objectStorageBinding: { environmentVariable: "D3_BACKFILL_OBJECT_ROOT" as const, targetIdentity: null, status: "MISSING" as const }, d2CanonicalTargetBinding: { environmentVariable: "D2_CANONICAL_POSTGRES_URL" as const, targetIdentity: null, status: "MISSING" as const }, d3PopulationTargetBinding: { environmentVariable: "D3_POPULATION_POSTGRES_URL" as const, targetIdentity: null, status: "MISSING" as const }, normalizerBindings: new ProductionNormalizerRegistry().bindings(), policies: [], checksumPolicy: "SHA-256" as const, retryPolicyReference: "UNRESOLVED", incrementalHandoffBoundary: "UNRESOLVED", unresolvedBlockers: ["D3P3-B03", "D3P3-B05"] }
  const manifest = createBackfillManifest(base)
  check("manifest checksum valid", verifyBackfillManifest(manifest))
  check("manifest order independent", manifest.manifestId === createBackfillManifest({ ...base, datasets: [...scope].reverse(), instruments: [...instruments].reverse(), unresolvedBlockers: [...base.unresolvedBlockers].reverse() }).manifestId)
  check("scope change changes manifest", manifest.manifestId !== createBackfillManifest({ ...base, frozenCutoffUtc: "2026-07-11T00:00:00.000Z" }).manifestId)

  const repositoryInspection = await inspectFilesystemObjectRoot({ root: process.cwd(), repositoryRoot: process.cwd(), createRoot: false })
  check("repository object root rejected", !repositoryInspection.safe && repositoryInspection.reasons.includes("OBJECT_ROOT_INSIDE_REPOSITORY"))
  check("certification D2 target rejected", !inspectDurablePostgresTarget("postgres://test_role@localhost:55432/quantterminal_d2_isolated", "D2_CANONICAL").safe)
  check("allowlisted durable D2 target accepted", inspectDurablePostgresTarget("postgres://test_role@localhost:55432/quantterminal_d2_backfill", "D2_CANONICAL").safe)

  const root = await mkdtemp(path.join(os.tmpdir(), "d3-storage-test-"))
  try {
    const storage = await createFilesystemObjectStorage({ root, repositoryRoot: process.cwd(), createRoot: true, testAuthorization: "ALLOW_D3_TEST_TEMP_ROOT" })
    const bytes = new TextEncoder().encode("verified raw artifact")
    const hash = createHash("sha256").update(bytes).digest("hex")
    const input = { objectStorageKey: `raw/${hash.slice(0, 2)}/${hash}.bin`, contentHash: hash, mediaType: "application/octet-stream", byteLength: bytes.byteLength, content: stream(bytes) }
    const first = await storage.putImmutable(input); const second = await storage.putImmutable({ ...input, content: stream(bytes) })
    check("artifact atomic write and duplicate reuse", first.rawObjectId === second.rawObjectId && (await storage.stat(input.objectStorageKey)).exists)
    const artifactPath = path.join(root, ...input.objectStorageKey.split("/"))
    check("artifact bytes preserved", new TextDecoder().decode(await readFile(artifactPath)) === "verified raw artifact")
    await rm(`${artifactPath}.metadata.json`)
    await storage.putImmutable({ ...input, content: stream(bytes) })
    check("interrupted sidecar publication recovers", (await storage.stat(input.objectStorageKey)).exists)
    const readChunks: Uint8Array[] = []; for await (const chunk of storage.read(input.objectStorageKey)) readChunks.push(chunk)
    check("artifact read verifies checksum", new TextDecoder().decode(Buffer.concat(readChunks)) === "verified raw artifact")
    let conflict = false
    try { await storage.putImmutable({ ...input, contentHash: "f".repeat(64), content: stream(bytes) }) } catch (error) { conflict = error instanceof Error && ["ARTIFACT_IMMUTABLE_CONFLICT", "ARTIFACT_KEY_HASH_MISMATCH"].includes(error.message) }
    check("artifact conflict fails closed", conflict)
  } finally { await rm(root, { recursive: true, force: true }) }

  const raw: RawObjectManifest = { objectId: `raw_${"a".repeat(64)}`, datasetId: "funding", providerId: "binance-futures-api", venue: "BINANCE", symbolOrSubject: "BTCUSDT", windowStart: "2026-07-01T00:00:00.000Z", windowEnd: "2026-07-02T00:00:00.000Z", contentHash: "a".repeat(64), sizeBytes: 1, mediaType: "application/zip", compression: "ZIP", retrievedAt: "2026-07-02T00:00:00.000Z", providerSnapshotId: "provider-snapshot", retentionClass: "ARCHIVE", verificationState: "VERIFIED", objectStorageKey: `raw/aa/${"a".repeat(64)}.zip`, createdAt: "2026-07-02T00:00:00.000Z" }
  const payload = { symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: "2026-07-01T08:00:00.000Z" }
  const candidate: PopulationCandidate = { kind: "FUNDING", candidateId: createCandidateId({ rawManifestId: raw.objectId, sourceObservationId: "funding-1", parserVersion: "binance-funding-csv-v1", candidateOrdinal: "0" }), unitId: "unit", retrievalAttemptId: "attempt", rawManifestId: raw.objectId, datasetId: "funding", providerId: "binance-futures-api", providerSnapshotId: "provider-snapshot", sourceObservationId: "funding-1", sourceObservedAt: payload.fundingTime, effectiveAt: payload.fundingTime, parserVersion: "binance-funding-csv-v1", candidateSchemaVersion: "1.0.0", payload, candidateChecksum: createHash("sha256").update(JSON.stringify(payload)).digest("hex"), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt: "2026-07-02T00:00:00.000Z" }
  const registry = new ProductionNormalizerRegistry()
  const normalized = registry.normalize({ candidate, rawObject: raw, datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-certification", policyVersionId: "funding-policy", schemaVersion: "1.0.0", normalizationVersion: "d3-phase3-normalizer-v1", rawManifestId: raw.objectId })
  const normalizedAgain = registry.normalize({ candidate, rawObject: raw, datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-certification", policyVersionId: "funding-policy", schemaVersion: "1.0.0", normalizationVersion: "d3-phase3-normalizer-v1", rawManifestId: raw.objectId })
  check("normalizer deterministic", JSON.stringify(normalized) === JSON.stringify(normalizedAgain))
  check("normalizer preserves raw lineage", normalized.requiredLineage.length === 1 && normalized.requiredLineage[0]?.source.nodeId === raw.objectId)
  const calls: string[] = []
  const adapter: CanonicalPersistenceAdapter = {
    async registerRegistrySnapshot() { throw new Error("NOT_USED") }, async registerProviderSnapshot() { throw new Error("NOT_USED") }, async registerPolicyVersion() { throw new Error("NOT_USED") },
    async registerRawObjectManifest() { calls.push("RAW"); return { status: "SUCCESS", objectId: raw.objectId } },
    async executeCanonicalCommit(command) { calls.push("COMMIT"); return { status: "DUPLICATE", canonicalRecordId: command.fact.identity.canonicalRecordId, recordVersion: command.targetRecordVersion, checksum: command.fact.checksum } },
    async readCanonicalRecordVersion() { return null }, async readLatestCanonicalVersion() { calls.push("LOOKUP"); return { status: "NOT_FOUND" } }, async appendPublicationDecision() { throw new Error("NOT_USED") }, async readLineageEdges() { return [] }, async verifyLineageAcyclic() { return true }, async readOutboxEvents() { return [] }, async readQuarantineConflicts() { return [] }, async reconcileCommit() { throw new Error("NOT_USED") },
  }
  const portResult = await createD3ToD2CanonicalCommitPort(adapter).execute(normalized)
  check("D3 to D2 mapping registers raw and checks version before commit", calls.join(",") === "RAW,LOOKUP,COMMIT" && portResult.status === "DUPLICATE")
  const plannedCorrection = planProviderCorrection(normalized, 1)
  check("correction planner increments version deterministically", plannedCorrection.targetRecordVersion === 2 && plannedCorrection.predecessor?.recordVersion === 1 && plannedCorrection.requiredLineage[0]?.destination.nodeVersion === "2")
  const correction = registry.normalize({ candidate, rawObject: raw, datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-certification", policyVersionId: "funding-policy", schemaVersion: "1.0.0", normalizationVersion: "d3-phase3-normalizer-v1", rawManifestId: raw.objectId, operationType: "PROVIDER_CORRECTION", targetRecordVersion: 2, predecessor: { ...normalized.fact.identity, recordVersion: 1, factTable: "FUNDING" } })
  check("correction creates next immutable version command", correction.targetRecordVersion === 2 && correction.predecessor?.recordVersion === 1)
  let invalid = false
  try { registry.normalize({ candidate: { ...candidate, payload: { ...payload, fundingRate: "invalid" } }, rawObject: raw, datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-certification", policyVersionId: "funding-policy", schemaVersion: "1.0.0", normalizationVersion: "d3-phase3-normalizer-v1", rawManifestId: raw.objectId }) } catch { invalid = true }
  check("invalid source rejected", invalid)
  if (failures) throw new Error(`${failures} D3 Phase 3 enablement checks failed`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
