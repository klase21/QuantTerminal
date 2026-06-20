import { randomUUID } from "node:crypto"
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  INTELLIGENCE_PRODUCTION_RUN_SCHEMA_VERSION,
  INTELLIGENCE_PRODUCTION_STAGES,
  type IntelligenceProductionRunReport,
  type IntelligenceProductionRunReportStore,
  type IntelligenceProductionRunSummary,
} from "@/core/intelligence-production"

export const DEFAULT_INTELLIGENCE_REPORT_ROOT = path.join(
  process.cwd(),
  ".data",
  "intelligence",
  "reports",
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT")
}

function validDateOrNull(value: unknown) {
  return value === null || (
    typeof value === "string"
    && Number.isFinite(Date.parse(value))
  )
}

function isRunReport(value: unknown): value is IntelligenceProductionRunReport {
  if (!isRecord(value) || !Array.isArray(value.stages)) return false
  const stageSet = new Set(INTELLIGENCE_PRODUCTION_STAGES)
  return (
    value.schemaVersion === INTELLIGENCE_PRODUCTION_RUN_SCHEMA_VERSION
    && typeof value.runId === "string"
    && typeof value.startedAt === "string"
    && Number.isFinite(Date.parse(value.startedAt))
    && validDateOrNull(value.completedAt)
    && typeof value.duration === "number"
    && Number.isFinite(value.duration)
    && typeof value.overallStatus === "string"
    && value.stages.length === INTELLIGENCE_PRODUCTION_STAGES.length
    && value.stages.every((stage) => (
      isRecord(stage)
      && typeof stage.stage === "string"
      && stageSet.has(stage.stage as typeof INTELLIGENCE_PRODUCTION_STAGES[number])
      && typeof stage.status === "string"
      && validDateOrNull(stage.startedAt)
      && validDateOrNull(stage.completedAt)
      && typeof stage.duration === "number"
      && Number.isFinite(stage.duration)
      && Array.isArray(stage.outputs)
      && Array.isArray(stage.warnings)
      && Array.isArray(stage.errors)
    ))
  )
}

function safeRunId(runId: string) {
  const normalized = runId.trim()
  if (!/^run-[A-Za-z0-9-]+$/.test(normalized)) {
    throw new Error("Intelligence production run id is invalid.")
  }
  return normalized
}

function runFile(root: string, runId: string) {
  return path.join(root, `${safeRunId(runId)}.json`)
}

async function writeJsonAtomic(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  const tempFile = `${file}.${randomUUID()}.tmp`
  await writeFile(tempFile, JSON.stringify(value), "utf8")
  await rename(tempFile, file)
}

async function readRunFile(file: string) {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"))
    if (!isRunReport(parsed)) throw new Error("Intelligence production run report is invalid.")
    return parsed
  } catch (error) {
    if (isMissingFile(error)) return null
    return null
  }
}

export function createIntelligenceProductionRunId(now = new Date()) {
  const timestamp = now.toISOString().replace(/[-:.]/g, "").replace(/\d{3}Z$/, "Z")
  return `run-${timestamp}-${randomUUID().slice(0, 8)}`
}

export function summarizeIntelligenceProductionRun(
  report: IntelligenceProductionRunReport,
): IntelligenceProductionRunSummary {
  return {
    runId: report.runId,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    duration: report.duration,
    overallStatus: report.overallStatus,
    outputCount: report.stages.reduce((total, stage) => total + stage.outputs.length, 0),
    warningCount: report.stages.reduce((total, stage) => total + stage.warnings.length, 0),
    errorCount: report.stages.reduce((total, stage) => total + stage.errors.length, 0),
    stages: report.stages.map((stage) => ({
      stage: stage.stage,
      status: stage.status,
      duration: stage.duration,
      outputCount: stage.outputs.length,
      warningCount: stage.warnings.length,
      errorCount: stage.errors.length,
    })),
  }
}

export class FileIntelligenceProductionRunReportStore
implements IntelligenceProductionRunReportStore {
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(readonly root: string = DEFAULT_INTELLIGENCE_REPORT_ROOT) {}

  private enqueue(operation: () => Promise<void>) {
    const result = this.mutationQueue.then(operation, operation)
    this.mutationQueue = result.then(() => undefined, () => undefined)
    return result
  }

  writeRun(report: IntelligenceProductionRunReport) {
    if (!isRunReport(report)) {
      return Promise.reject(new Error("Intelligence production run report is invalid."))
    }
    return this.enqueue(() => writeJsonAtomic(runFile(this.root, report.runId), report))
  }

  getRun(runId: string) {
    return readRunFile(runFile(this.root, runId))
  }

  private async readAllRuns() {
    let files: string[]
    try {
      files = await readdir(this.root)
    } catch (error) {
      if (isMissingFile(error)) return []
      throw error
    }

    const reports: IntelligenceProductionRunReport[] = []
    for (const file of files.filter((candidate) => /^run-[A-Za-z0-9-]+\.json$/.test(candidate))) {
      const report = await readRunFile(path.join(this.root, file))
      if (report) reports.push(report)
    }
    return reports
      .sort((left, right) => (
        Date.parse(right.startedAt) - Date.parse(left.startedAt)
        || right.runId.localeCompare(left.runId)
      ))
  }

  async listRecentRuns(limit: number) {
    const boundedLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(100, Math.floor(limit)))
      : 10
    return (await this.readAllRuns()).slice(0, boundedLimit)
  }

  async getLatestRun() {
    return (await this.listRecentRuns(1))[0] ?? null
  }

  async getLatestSuccessfulRun() {
    return (await this.readAllRuns())
      .find((report) => report.overallStatus === "succeeded") ?? null
  }
}
