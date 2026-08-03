import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import {
  createGreenCleanWindowsCommandLine,
  launchGreenCleanWindowsCommand,
} from "@/lib/data-platform/mvp-refresh/greenCleanBootstrapRuntime"
import {
  createGreenCleanOneDayReceiptContext,
  ensureGreenCleanOneDayFailureReceipt,
  type GreenCleanOneDayExecutionReceipt,
} from "@/lib/data-platform/mvp-refresh/greenCleanOneDayReceipt"

class OutputCapture {
  value = ""
  write(value: string): void { this.value += value }
}

async function storedReceipt(receiptPath: string): Promise<GreenCleanOneDayExecutionReceipt> {
  return JSON.parse(await readFile(receiptPath, "utf8")) as GreenCleanOneDayExecutionReceipt
}

async function main(): Promise<void> {
  const commandLine = createGreenCleanWindowsCommandLine(process.execPath, ["--import", "tsx", "tests/data-platform/mvp-refresh/fixtures/greenCleanLauncherProbe.ts"])
  assert.equal(commandLine, `""${process.execPath}" "--import" "tsx" "tests/data-platform/mvp-refresh/fixtures/greenCleanLauncherProbe.ts""`)
  assert.throws(
    () => createGreenCleanWindowsCommandLine(process.execPath, ["safe&unsafe"]),
    /GREEN_CLEAN_WINDOWS_COMMAND_TOKEN_INVALID/,
  )

  if (process.platform === "win32") {
    const temporary = await mkdtemp(path.join(tmpdir(), "qt-green-clean-launcher-"))
    try {
      const stdout = new OutputCapture()
      const stderr = new OutputCapture()
      const successContext = createGreenCleanOneDayReceiptContext({ cwd: process.cwd(), environment: process.env, receiptRoot: temporary, invocationId: "success", stdout, stderr })
      const success = await launchGreenCleanWindowsCommand({ command: process.execPath, args: ["--import", "tsx", "tests/data-platform/mvp-refresh/fixtures/greenCleanLauncherProbe.ts"], cwd: process.cwd(), environment: process.env, receiptContext: successContext })
      assert.equal(success.exitCode, 0, JSON.stringify(success))
      assert.deepEqual(JSON.parse(success.stdout.trim()), { status: "STARTED", databaseConnections: 0 })
      assert.match(stdout.value, /"status":"STARTED"/)
      assert.equal(stderr.value, "")
      assert.equal((await storedReceipt(successContext.receiptFilePath)).finalClassification, "SUCCESS")
      await ensureGreenCleanOneDayFailureReceipt(successContext, new Error("POST_CHILD_VERIFICATION_FAILED"))
      const parentFailureReceipt = await storedReceipt(successContext.receiptFilePath)
      assert.equal(parentFailureReceipt.finalClassification, "PARENT_FAILURE")
      assert.match(parentFailureReceipt.stderr, /POST_CHILD_VERIFICATION_FAILED/)

      const preflightContext = createGreenCleanOneDayReceiptContext({ cwd: process.cwd(), environment: process.env, receiptRoot: temporary, invocationId: "preflight", stdout: new OutputCapture(), stderr: new OutputCapture() })
      await ensureGreenCleanOneDayFailureReceipt(preflightContext, new Error("PREFLIGHT_FAILED"))
      const preflightReceipt = await storedReceipt(preflightContext.receiptFilePath)
      assert.equal(preflightReceipt.childStartAttempted, false)
      assert.equal(preflightReceipt.finalClassification, "PARENT_FAILURE")

      const failureStdout = new OutputCapture()
      const failureStderr = new OutputCapture()
      const secret = "launcher-test-secret-value"
      const databaseUrl = ["postgresql://reader:", "launcher-password", "@localhost:5432/disposable"].join("")
      const failureEnvironment = { ...process.env, GREEN_CLEAN_LAUNCHER_TEST_SECRET: secret, GREEN_CLEAN_LAUNCHER_TEST_POSTGRES_URL: databaseUrl }
      const failureContext = createGreenCleanOneDayReceiptContext({ cwd: process.cwd(), environment: failureEnvironment, receiptRoot: temporary, invocationId: "failure", stdout: failureStdout, stderr: failureStderr })
      const failure = await launchGreenCleanWindowsCommand({ command: process.execPath, args: ["--import", "tsx", "tests/data-platform/mvp-refresh/fixtures/greenCleanLauncherProbe.ts", "failure", `--password=${secret}`, databaseUrl], cwd: process.cwd(), environment: failureEnvironment, receiptContext: failureContext })
      assert.equal(failure.exitCode, 1)
      const failureReceipt = await storedReceipt(failureContext.receiptFilePath)
      assert.equal(failureReceipt.finalClassification, "CHILD_NONZERO_EXIT")
      assert.match(failureReceipt.stdout, /"status":"STARTED"/)
      assert.match(failureReceipt.stderr, /GREEN_CLEAN_LAUNCHER_PROBE_FAILED/)
      assert.match(failureStdout.value, /"status":"STARTED"/)
      assert.match(failureStderr.value, /GREEN_CLEAN_LAUNCHER_PROBE_FAILED/)
      assert.doesNotMatch(JSON.stringify(failureReceipt), new RegExp(secret))
      assert.doesNotMatch(JSON.stringify(failureReceipt), /launcher-password/)
      assert(failureReceipt.redactedArgumentList.includes("--password=[REDACTED]"))

      const spawnStdout = new OutputCapture()
      const spawnStderr = new OutputCapture()
      const spawnContext = createGreenCleanOneDayReceiptContext({ cwd: process.cwd(), environment: process.env, receiptRoot: temporary, invocationId: "spawn", stdout: spawnStdout, stderr: spawnStderr })
      await assert.rejects(() => launchGreenCleanWindowsCommand({ command: process.execPath, args: ["--version"], cwd: path.join(temporary, "missing-cwd"), environment: process.env, receiptContext: spawnContext }))
      const spawnReceipt = await storedReceipt(spawnContext.receiptFilePath)
      assert.equal(spawnReceipt.finalClassification, "SPAWN_FAILURE")
      assert.equal(spawnReceipt.childStartAttempted, true)
      assert.match(spawnStderr.value, /GREEN_CLEAN_ONE_DAY_CHILD_SPAWN_FAILED/)

      const fallbackStderr = new OutputCapture()
      const fallbackContext = createGreenCleanOneDayReceiptContext({ cwd: process.cwd(), environment: process.env, receiptRoot: temporary, invocationId: "fallback", stdout: new OutputCapture(), stderr: fallbackStderr, persist: async () => { throw new Error("INTENTIONAL_RECEIPT_WRITE_FAILURE") } })
      const fallback = await launchGreenCleanWindowsCommand({ command: process.execPath, args: ["--import", "tsx", "tests/data-platform/mvp-refresh/fixtures/greenCleanLauncherProbe.ts", "failure"], cwd: process.cwd(), environment: process.env, receiptContext: fallbackContext })
      assert.equal(fallback.exitCode, 1)
      assert.match(fallback.stderr, /GREEN_CLEAN_LAUNCHER_PROBE_FAILED/)
      assert.match(fallbackStderr.value, /GREEN_CLEAN_LAUNCHER_PROBE_FAILED/)
      assert.match(fallbackStderr.value, /GREEN_CLEAN_ONE_DAY_RECEIPT_WRITE_FAILED:INTENTIONAL_RECEIPT_WRITE_FAILURE/)
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  }

  console.log(JSON.stringify({
    status: "PASS",
    platform: process.platform,
    cmdExeOuterShell: false,
    directCmdLaunch: false,
    databaseConnections: 0,
  }))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_WINDOWS_LAUNCHER_SUITE_FAILED")
  process.exitCode = 1
})
