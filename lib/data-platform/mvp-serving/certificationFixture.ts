import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createServingCorpus, type MvpServingPublication } from "./contracts"

export function createMinimalActiveServingFixture(generatedAt = "2026-07-18T00:00:00.000Z"): MvpServingPublication {
  const corpus = createServingCorpus({ corpusVersion: "mvp-minimal-active-fixture/1.0.0", sourceCorpusId: "mvp-minimal-active-fixture-source", sourceCorpusChecksum: canonicalChecksum("mvp-minimal-active-fixture-source"), generatedAt, governedThrough: generatedAt, projectionCount: 0, evidenceSummaryCount: 0, replaySnapshotCount: 0, demoProfileCount: 0, releaseInventoryCount: 0, publicationEventCount: 1, releaseDigest: canonicalChecksum("mvp-minimal-active-fixture-release") })
  return Object.freeze({ corpus, projections: Object.freeze([]), evidenceSummaries: Object.freeze([]), replaySnapshots: Object.freeze([]), demoProfiles: Object.freeze([]), releaseInventory: Object.freeze([]) })
}
