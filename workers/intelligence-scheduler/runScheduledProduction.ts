import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  DEFAULT_INTELLIGENCE_REPORT_ROOT,
  DEFAULT_INTELLIGENCE_SCHEDULER_ROOT,
  FileIntelligenceSchedulerStore,
  runScheduledProduction,
} from "@/lib/intelligence-production"
import { DEFAULT_DURABLE_ARTIFACT_ROOT } from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const everyMinutes = Number(argument("every-minutes"))
  const result = await runScheduledProduction({
    jobId: argument("job-id"),
    enabled: process.argv.includes("--enable")
      ? true
      : process.argv.includes("--disable")
        ? false
        : undefined,
    everyMinutes: Number.isInteger(everyMinutes) && everyMinutes > 0
      ? everyMinutes
      : undefined,
    schedulerStore: new FileIntelligenceSchedulerStore(
      argument("scheduler-root") ?? DEFAULT_INTELLIGENCE_SCHEDULER_ROOT,
    ),
    artifactRoot: argument("artifact-root") ?? DEFAULT_DURABLE_ARTIFACT_ROOT,
    reportRoot: argument("report-root") ?? DEFAULT_INTELLIGENCE_REPORT_ROOT,
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
