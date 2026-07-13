import { readFile } from "node:fs/promises"

import { D3_PHASE3_MANIFEST, verifyBackfillManifest, type BackfillManifest } from "@/lib/data-platform/population/backfill"

async function main() {
  const persisted = JSON.parse(await readFile("docs/project/d3-phase-3-backfill-manifest.json", "utf8")) as BackfillManifest
  console.log(JSON.stringify({
    manifestId: D3_PHASE3_MANIFEST.manifestId,
    manifestChecksum: D3_PHASE3_MANIFEST.manifestChecksum,
    executable: D3_PHASE3_MANIFEST.executable,
    executablePartitions: D3_PHASE3_MANIFEST.partitions.filter((partition) => partition.status === "EXECUTABLE").length,
    blockedPartitions: D3_PHASE3_MANIFEST.partitions.filter((partition) => partition.status === "BLOCKED").length,
    persistedChecksumValid: verifyBackfillManifest(persisted),
    persistedMatchesRuntime: persisted.manifestId === D3_PHASE3_MANIFEST.manifestId,
  }))
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" }))
  process.exitCode = 1
})
