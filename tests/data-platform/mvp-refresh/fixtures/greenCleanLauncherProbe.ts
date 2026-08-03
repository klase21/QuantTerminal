const mode = process.argv[2] ?? "success"
const secret = process.env.GREEN_CLEAN_LAUNCHER_TEST_SECRET ?? ""
const databaseUrl = process.env.GREEN_CLEAN_LAUNCHER_TEST_POSTGRES_URL ?? ""

process.stdout.write(`${JSON.stringify({ status: "STARTED", databaseConnections: 0, ...(secret ? { secret } : {}) })}\n`)
if (databaseUrl) process.stderr.write(`probe-url=${databaseUrl}\n`)
if (mode === "failure") {
  process.stderr.write("GREEN_CLEAN_LAUNCHER_PROBE_FAILED\n")
  process.exitCode = 1
}
