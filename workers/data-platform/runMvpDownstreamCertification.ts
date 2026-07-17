import { certifyAuthenticatedDownstreamRollback, DOWNSTREAM_BOUNDARY_MAP } from "@/lib/data-platform/mvp-refresh"

async function main(): Promise<void> {
  const command = process.argv[2]
  if (command === "inspect") {
    console.log(JSON.stringify({ stages: DOWNSTREAM_BOUNDARY_MAP }, null, 2))
    return
  }
  if (command !== "certify") throw new Error("MVP_DOWNSTREAM_CERTIFICATION_COMMAND_REQUIRED")
  const result = await certifyAuthenticatedDownstreamRollback()
  console.log(JSON.stringify(result, null, 2))
}

void main().catch((error) => {
  const classification = error instanceof Error && /^[A-Z0-9_:.-]+$/.test(error.message) ? error.message : "DOWNSTREAM_CERTIFICATION_FAILED"
  console.error(JSON.stringify({ passed: false, classification }))
  process.exitCode = 1
})
