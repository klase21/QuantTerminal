import { readFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createServingCorpus, discoverMvpServingMigrations, inspectMvpServingIsolatedTarget, resolveMvpServingMode, verifyReplaySnapshot } from "@/lib/data-platform/mvp-serving"
import { verifyCertifiedSnapshotBundle, type CertifiedSnapshotBundle } from "@/lib/data-platform/mvp-serving/snapshotContract"

async function main() {
  const checks: Array<[string, boolean]> = [], check = (name: string, pass: boolean) => checks.push([name, pass])
  const migrations = await discoverMvpServingMigrations()
  check("versioned migrations discovered", migrations.length === 2 && migrations.every((value) => /^[0-9a-f]{64}$/.test(value.checksum)))
  const syntheticUrl = (database: string) => `postgresql://${"mvp_serving_reader"}:${"synthetic"}@localhost:55432/${database}`
  check("isolated target accepts exact local database", inspectMvpServingIsolatedTarget(syntheticUrl("quantterminal_mvp_serving_isolated"), {}).safe)
  check("truth-plane target rejected", !inspectMvpServingIsolatedTarget(syntheticUrl("quantterminal_d4_isolated"), {}).safe)
  check("explicit serving mode", resolveMvpServingMode({ MVP_SERVING_MODE: "serving_postgres" }) === "serving_postgres")
  let productionMissing = false
  try { resolveMvpServingMode({ NODE_ENV: "production" }) } catch (error) { productionMissing = error instanceof Error && error.message === "MVP_SERVING_MODE_REQUIRED" }
  check("production mode fails closed", productionMissing)
  const snapshot = JSON.parse(await readFile(path.join(process.cwd(), "lib", "data-platform", "mvp-serving", "generated", "certifiedSnapshot.json"), "utf8")) as unknown as CertifiedSnapshotBundle
  const { bundleChecksum, ...basis } = snapshot
  check("fallback checksum deterministic", canonicalChecksum(basis) === bundleChecksum)
  check("fallback bounded", snapshot.replaySnapshots.length === 2 && snapshot.demoProfiles.length === 2 && snapshot.projections.length < 100 && snapshot.evidenceSummaries.length === 2)
  check("fallback Replay checksums valid", snapshot.replaySnapshots.every(verifyReplaySnapshot))
  check("fallback Replay sample bounds", snapshot.replaySnapshots.every((value) => value.priceSampleCount === 288 && value.openInterestSampleCount === 288 && value.fundingSampleCount === 3 && value.flowBucketCount === 48))
  let tamperRejected = false, corpusMismatchRejected = false
  try { verifyCertifiedSnapshotBundle({ ...snapshot, bundleChecksum: "0".repeat(64) }, {}) } catch (error) { tamperRejected = error instanceof Error && error.message === "CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH" }
  try { verifyCertifiedSnapshotBundle(snapshot, { MVP_SERVING_EXPECTED_CHECKSUM: "f".repeat(64) }) } catch (error) { corpusMismatchRejected = error instanceof Error && error.message === "SERVING_CORPUS_CHECKSUM_MISMATCH" }
  check("fallback tampering fails closed", tamperRejected)
  check("expected corpus mismatch fails closed", corpusMismatchRejected)
  const corpusInput = { corpusVersion: "test", sourceCorpusId: "source", sourceCorpusChecksum: "a".repeat(64), generatedAt: "2026-07-15T00:00:00.000Z", governedThrough: "2026-07-15T00:00:00.000Z", projectionCount: 1, evidenceSummaryCount: 1, replaySnapshotCount: 1, demoProfileCount: 2, releaseInventoryCount: 3, publicationEventCount: 1, releaseDigest: "b".repeat(64) }
  check("serving corpus identity deterministic", createServingCorpus(corpusInput).corpusId === createServingCorpus(corpusInput).corpusId)
  const failures = checks.filter(([, pass]) => !pass)
  console.log(`MVP SERVING UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
  for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
  if (failures.length) process.exitCode = 1
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_SERVING_UNIT_SUITE_FAILED"); process.exitCode = 1 })
