import { runCommitBearingLogicalSlotCertification } from "@/lib/data-platform/mvp-refresh/commitBearingLogicalSlotCertification"

void runCommitBearingLogicalSlotCertification()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error: unknown) => {
    const value = error instanceof Error ? error.message.split(":", 1)[0] : "COMMIT_BEARING_CERTIFICATION_FAILED"
    console.error(JSON.stringify({ passed: false, classification: /^[A-Z0-9_]+$/.test(value) ? value : "COMMIT_BEARING_CERTIFICATION_FAILED" }))
    process.exitCode = 1
  })
