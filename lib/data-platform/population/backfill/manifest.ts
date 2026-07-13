import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { BackfillManifest, BackfillManifestContent } from "./contracts"

function contentForIdentity(content: BackfillManifestContent): BackfillManifestContent {
  return Object.freeze({ ...content, datasets: Object.freeze([...content.datasets].sort((a, b) => a.datasetId.localeCompare(b.datasetId))), instruments: Object.freeze([...content.instruments].sort((a, b) => a.canonicalInstrumentId.localeCompare(b.canonicalInstrumentId))), partitions: Object.freeze([...content.partitions].sort((a, b) => a.partitionId.localeCompare(b.partitionId))), normalizerBindings: Object.freeze([...content.normalizerBindings].sort((a, b) => `${a.datasetId}:${a.candidateKind}`.localeCompare(`${b.datasetId}:${b.candidateKind}`))), policies: Object.freeze([...content.policies].sort((a, b) => a.policyId.localeCompare(b.policyId))), unresolvedBlockers: Object.freeze([...content.unresolvedBlockers].sort()) })
}

export function createBackfillManifest(content: BackfillManifestContent): BackfillManifest {
  if (!Number.isFinite(Date.parse(content.frozenCutoffUtc))) throw new Error("MANIFEST_CUTOFF_INVALID")
  const canonical = contentForIdentity(content)
  const manifestChecksum = canonicalChecksum(canonical)
  return Object.freeze({ ...canonical, manifestId: `bfm_${manifestChecksum}`, manifestChecksum })
}

export function verifyBackfillManifest(manifest: BackfillManifest): boolean {
  const { manifestId, manifestChecksum, ...content } = manifest
  const expected = createBackfillManifest(content)
  return expected.manifestId === manifestId && expected.manifestChecksum === manifestChecksum
}
