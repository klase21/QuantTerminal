import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { deriveCanonicalRecordIdentity, plannedCommitIdentity, type CanonicalCommitCommand, type FundingFact, type RawObjectManifest } from "@/lib/data-platform/persistence"
import type { PolicyVersionInput, ProviderSnapshotInput, RegistrySnapshotInput } from "@/lib/data-platform/persistence/postgres"

export const FIXTURE_TIME = "2026-01-01T00:00:00.000Z"
export const registrySnapshot: RegistrySnapshotInput = { snapshotId: "d2-test-dataset-registry-v1", registryVersion: "1", contentChecksum: canonicalChecksum(["dataset-registry", "1"]), canonicalContent: { scope: "isolated-test", version: "1" }, effectiveAt: FIXTURE_TIME, createdAt: FIXTURE_TIME }
export const providerSnapshot: ProviderSnapshotInput = { snapshotId: "d2-test-provider-registry-v1", providerId: "d2-test-provider", registrationVersion: "1", certificationStatus: "CERTIFIED", contentChecksum: canonicalChecksum(["provider-registry", "1"]), canonicalContent: { scope: "isolated-test", provider: "d2-test-provider" }, effectiveAt: FIXTURE_TIME, createdAt: FIXTURE_TIME }
export const certificationSnapshot: ProviderSnapshotInput = { ...providerSnapshot, snapshotId: "d2-test-provider-certification-v1", contentChecksum: canonicalChecksum(["provider-certification", "1"]), canonicalContent: { scope: "isolated-test", certification: "CERTIFIED" } }
export const policyVersion: PolicyVersionInput = { policyVersionId: "d2-test-funding-policy-v1", datasetId: "funding", policyVersion: "1", contentChecksum: canonicalChecksum(["funding-policy", "1"]), canonicalContent: { scope: "isolated-test", publication: "strict" }, effectiveAt: FIXTURE_TIME, createdAt: FIXTURE_TIME }

export function rawManifest(suffix = "a"): RawObjectManifest {
  const contentHash = canonicalChecksum(["raw-funding", suffix])
  return { objectId: `raw_${contentHash}`, datasetId: "funding", providerId: "d2-test-provider", venue: "BINANCE", symbolOrSubject: "BTCUSDT", windowStart: FIXTURE_TIME, windowEnd: "2026-01-01T08:00:00.000Z", contentHash, sizeBytes: 128, mediaType: "application/json", compression: "NONE", retrievedAt: FIXTURE_TIME, providerSnapshotId: providerSnapshot.snapshotId, retentionClass: "STANDARD", verificationState: "VERIFIED", objectStorageKey: `d2-test/funding/${contentHash}`, createdAt: FIXTURE_TIME }
}

export function fundingCommand(input: { readonly suffix?: string; readonly rate?: string; readonly version?: number; readonly correction?: boolean; readonly predecessor?: CanonicalCommitCommand["predecessor"] } = {}): CanonicalCommitCommand {
  const suffix = input.suffix ?? "a"
  const manifest = rawManifest(suffix)
  const placeholder = { datasetId: "funding", businessIdentity: "pending", canonicalRecordId: "pending" }
  const base: FundingFact = { kind: "FUNDING", identity: placeholder, providerId: "d2-test-provider", venue: "BINANCE", symbolOrSubject: "BTCUSDT", observedAt: FIXTURE_TIME, effectiveAt: FIXTURE_TIME, checksum: canonicalChecksum(["funding", input.rate ?? "0.0001", suffix]), governance: { datasetRegistrySnapshotId: registrySnapshot.snapshotId, providerRegistrySnapshotId: providerSnapshot.snapshotId, providerCertificationSnapshotId: certificationSnapshot.snapshotId, policyVersionId: policyVersion.policyVersionId, schemaVersion: "1", normalizationVersion: "1" }, fundingRate: input.rate ?? "0.0001", fundingTime: FIXTURE_TIME }
  const identity = deriveCanonicalRecordIdentity(base)
  const fact: FundingFact = { ...base, identity }
  const version = input.version ?? 1
  const provisional: CanonicalCommitCommand = { operationType: input.correction ? "PROVIDER_CORRECTION" : "INITIAL_VERSION", idempotencyKey: `d2-test:${identity.canonicalRecordId}:v${version}:${suffix}`, initiatedAt: FIXTURE_TIME, rawObject: manifest, fact, targetRecordVersion: version, predecessor: input.predecessor ?? null, requiredLineage: [] }
  const commitId = plannedCommitIdentity(provisional)
  return { ...provisional, requiredLineage: [{ edgeId: `edge_${canonicalChecksum([manifest.objectId, identity.canonicalRecordId, version])}`, source: { nodeType: "RAW_OBJECT", nodeId: manifest.objectId, nodeVersion: manifest.contentHash }, destination: { nodeType: "CANONICAL_FACT", nodeId: identity.canonicalRecordId, nodeVersion: String(version) }, relationship: "NORMALIZED_FROM", commitId, createdAt: FIXTURE_TIME, digest: fact.checksum }] }
}
