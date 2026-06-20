import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import {
  FileIntelligenceProductionRunReportStore,
  FileIntelligenceSchedulerStore,
  readIntelligenceOperationsSnapshot,
  runScheduledProduction,
} from "@/lib/intelligence-production"

interface SmokeCheck {
  name: string
  passed: boolean
  detail: string
}

const ACCEPTABLE_STORE_STATES = new Set(["healthy", "empty", "unavailable"])

function detail(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function runIntelligenceSmokeTest() {
  const checks: SmokeCheck[] = []
  const check = (name: string, passed: boolean, message: string) => {
    checks.push({ name, passed, detail: message })
  }

  try {
    const scheduled = await runScheduledProduction()
    check(
      "Scheduled production runner",
      scheduled.status === "executed" || scheduled.status === "skipped",
      scheduled.status === "executed"
        ? `Executed run ${scheduled.runId ?? "without run id"}.`
        : `Skipped safely: ${scheduled.reason ?? "unspecified reason"}.`,
    )
  } catch (error) {
    check("Scheduled production runner", false, detail(error))
  }

  const reportStore = new FileIntelligenceProductionRunReportStore()
  try {
    const latestRun = await reportStore.getLatestRun()
    check(
      "Latest production run exists",
      Boolean(latestRun),
      latestRun
        ? `${latestRun.runId} (${latestRun.overallStatus}).`
        : "No durable production run report exists.",
    )
  } catch (error) {
    check("Latest production run exists", false, detail(error))
  }

  try {
    const recentRuns = await reportStore.listRecentRuns(10)
    check(
      "Run report store readable",
      Array.isArray(recentRuns),
      `Read ${recentRuns.length} recent run report(s).`,
    )
  } catch (error) {
    check("Run report store readable", false, detail(error))
  }

  try {
    const schedulerState = await new FileIntelligenceSchedulerStore().readState()
    check(
      "Scheduler state readable",
      Boolean(schedulerState),
      schedulerState
        ? `${schedulerState.jobId} (${schedulerState.status}).`
        : "Scheduler state has not been generated.",
    )
  } catch (error) {
    check("Scheduler state readable", false, detail(error))
  }

  try {
    const artifacts = await new FileBackedIntelligenceArtifactRegistry().search({
      includeArchived: true,
      includeExpired: true,
      limit: 1,
    })
    check(
      "Artifact store readable",
      Number.isFinite(artifacts.total),
      `Artifact index reports ${artifacts.total} artifact(s).`,
    )
  } catch (error) {
    check("Artifact store readable", false, detail(error))
  }

  try {
    const snapshot = await readIntelligenceOperationsSnapshot()
    check(
      "Operations latest run exists",
      Boolean(snapshot.production.latestRun),
      snapshot.production.latestRun
        ? `${snapshot.production.latestRun.runId} (${snapshot.production.latestRun.overallStatus}).`
        : "Operations snapshot has no latest run.",
    )
    check(
      "Operations recent runs readable",
      Array.isArray(snapshot.production.recentRuns),
      `Operations snapshot returned ${snapshot.production.recentRuns.length} recent run(s).`,
    )
    check(
      "Operations artifact store state",
      ACCEPTABLE_STORE_STATES.has(snapshot.stores.artifactStore),
      snapshot.stores.artifactStore,
    )
    check(
      "Operations run report store state",
      ACCEPTABLE_STORE_STATES.has(snapshot.stores.runReportStore),
      snapshot.stores.runReportStore,
    )
    check(
      "Operations scheduler state",
      ACCEPTABLE_STORE_STATES.has(snapshot.stores.schedulerState),
      snapshot.stores.schedulerState,
    )
  } catch (error) {
    check("Operations snapshot readable", false, detail(error))
  }

  const passed = checks.filter((item) => item.passed).length
  const failed = checks.length - passed
  const status = failed === 0 ? "PASS" : "FAIL"

  process.stdout.write(`INTELLIGENCE PLATFORM SMOKE TEST: ${status}\n`)
  process.stdout.write(`Checks passed: ${passed}\n`)
  process.stdout.write(`Checks failed: ${failed}\n\n`)
  for (const item of checks) {
    process.stdout.write(`[${item.passed ? "PASS" : "FAIL"}] ${item.name}: ${item.detail}\n`)
  }

  if (failed > 0) process.exitCode = 1
  return { status, passed, failed, checks }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runIntelligenceSmokeTest().catch((error) => {
    process.stderr.write(`INTELLIGENCE PLATFORM SMOKE TEST: FAIL\n${detail(error)}\n`)
    process.exitCode = 1
  })
}

export { runIntelligenceSmokeTest }
