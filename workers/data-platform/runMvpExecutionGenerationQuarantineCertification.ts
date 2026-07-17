import { runExecutionGenerationQuarantineCertification } from "@/lib/data-platform/mvp-refresh"

void runExecutionGenerationQuarantineCertification()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error: unknown) => { console.error(error instanceof Error ? error.message : "QUARANTINE_CERTIFICATION_FAILED"); process.exitCode = 1 })
