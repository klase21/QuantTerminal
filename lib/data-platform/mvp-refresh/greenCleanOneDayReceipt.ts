import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdir, rename, writeFile } from "node:fs/promises"
import path from "node:path"

export const GREEN_CLEAN_ONE_DAY_RECEIPT_VERSION = "mvp-green-clean-one-day-execution-receipt/1.0.0"
export const GREEN_CLEAN_ONE_DAY_CAPTURE_LIMIT = 1_048_576

type WritableText = { write(value: string): unknown }

export interface GreenCleanOneDayExecutionReceipt {
  readonly receiptVersion: typeof GREEN_CLEAN_ONE_DAY_RECEIPT_VERSION
  readonly invocationId: string
  readonly startedAt: string
  readonly completedAt: string
  readonly parentPid: number
  readonly childStartAttempted: boolean
  readonly childStartSucceeded: boolean
  readonly childPid: number | null
  readonly executableIdentity: string | null
  readonly redactedArgumentList: readonly string[]
  readonly cwd: string
  readonly childExitCode: number | null
  readonly childSignal: NodeJS.Signals | null
  readonly spawnErrorCode: string | null
  readonly spawnErrorMessage: string | null
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly captureLimitCharactersPerStream: number
  readonly finalClassification: "SUCCESS" | "CHILD_NONZERO_EXIT" | "SPAWN_FAILURE" | "PARENT_FAILURE"
  readonly receiptFilePath: string
}

export interface GreenCleanOneDayReceiptContext {
  readonly invocationId: string
  readonly startedAt: string
  readonly parentPid: number
  readonly receiptFilePath: string
  readonly stdout: WritableText
  readonly stderr: WritableText
  readonly sensitiveValues: readonly string[]
  readonly now: () => string
  readonly persist: (receiptFilePath: string, receipt: GreenCleanOneDayExecutionReceipt) => Promise<void>
  finalizedReceipt: GreenCleanOneDayExecutionReceipt | null
  receiptPersisted: boolean
}

export interface GreenCleanWindowsCommandResult {
  readonly exitCode: number | null
  readonly signal: NodeJS.Signals | null
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly childPid: number | null
}

function secretEnvironmentValues(environment: Readonly<NodeJS.ProcessEnv>): readonly string[] {
  return Object.freeze(Object.entries(environment)
    .filter(([key, value]) => Boolean(value) && /(?:PASSWORD|TOKEN|SECRET|API_KEY|AUTHORIZATION|CREDENTIAL|POSTGRES_URL|DATABASE_URL)$/i.test(key))
    .map(([, value]) => value!)
    .filter((value) => value.length >= 4)
    .sort((left, right) => right.length - left.length))
}

function redactUrl(value: string): string {
  try {
    const parsed = new URL(value)
    if (!["postgres:", "postgresql:", "http:", "https:"].includes(parsed.protocol)) return value
    return `${parsed.protocol}//[REDACTED]`
  } catch {
    return value
  }
}

export function sanitizeGreenCleanOneDayText(value: string, sensitiveValues: readonly string[] = []): string {
  let sanitized = value
  for (const secret of sensitiveValues) sanitized = sanitized.split(secret).join("[REDACTED]")
  sanitized = sanitized.replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s"'<>]+/gi, (match) => redactUrl(match))
  sanitized = sanitized.replace(/\b(?:password|token|secret|api[_-]?key|authorization)=([^\s;&]+)/gi, (_match, _value, offset: number, source: string) => {
    const key = source.slice(offset, offset + source.slice(offset).indexOf("="))
    return `${key}=[REDACTED]`
  })
  sanitized = sanitized.replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
  return sanitized
}

export function redactGreenCleanOneDayArguments(args: readonly string[], sensitiveValues: readonly string[] = []): readonly string[] {
  return Object.freeze(args.map((argument) => {
    const separator = argument.indexOf("=")
    if (separator > 0 && /(?:password|token|secret|api[_-]?key|authorization|credential|postgres[_-]?url|database[_-]?url|connection[_-]?url)/i.test(argument.slice(0, separator))) {
      return `${argument.slice(0, separator)}=[REDACTED]`
    }
    return sanitizeGreenCleanOneDayText(argument, sensitiveValues)
  }))
}

async function writeReceiptAtomically(receiptFilePath: string, receipt: GreenCleanOneDayExecutionReceipt): Promise<void> {
  await mkdir(path.dirname(receiptFilePath), { recursive: true })
  const temporary = `${receiptFilePath}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" })
  await rename(temporary, receiptFilePath)
}

export function createGreenCleanOneDayReceiptContext(options: {
  readonly cwd?: string
  readonly environment?: Readonly<NodeJS.ProcessEnv>
  readonly invocationId?: string
  readonly startedAt?: string
  readonly parentPid?: number
  readonly receiptRoot?: string
  readonly stdout?: WritableText
  readonly stderr?: WritableText
  readonly now?: () => string
  readonly persist?: GreenCleanOneDayReceiptContext["persist"]
} = {}): GreenCleanOneDayReceiptContext {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const invocationId = options.invocationId ?? `gc1d_${randomUUID().replaceAll("-", "")}`
  const receiptRoot = path.resolve(options.receiptRoot ?? path.join(cwd, ".data", "green-clean-run-one-day-receipts"))
  return {
    invocationId,
    startedAt: options.startedAt ?? new Date().toISOString(),
    parentPid: options.parentPid ?? process.pid,
    receiptFilePath: path.join(receiptRoot, `${invocationId}.json`),
    stdout: options.stdout ?? process.stdout,
    stderr: options.stderr ?? process.stderr,
    sensitiveValues: secretEnvironmentValues(options.environment ?? process.env),
    now: options.now ?? (() => new Date().toISOString()),
    persist: options.persist ?? writeReceiptAtomically,
    finalizedReceipt: null,
    receiptPersisted: false,
  }
}

class BoundedForwardingCapture {
  private pending = ""
  private captured = ""
  private didTruncate = false

  constructor(
    private readonly terminal: WritableText,
    private readonly sensitiveValues: readonly string[],
  ) {}

  append(chunk: string): void {
    this.pending += chunk
    const lines = this.pending.split(/\r?\n/)
    this.pending = lines.pop() ?? ""
    for (const line of lines) this.forward(`${sanitizeGreenCleanOneDayText(line, this.sensitiveValues)}\n`)
  }

  flush(): void {
    if (this.pending) this.forward(`${sanitizeGreenCleanOneDayText(this.pending, this.sensitiveValues)}\n`)
    this.pending = ""
  }

  value(): string { return this.captured }
  truncated(): boolean { return this.didTruncate }

  private forward(value: string): void {
    this.terminal.write(value)
    const remaining = GREEN_CLEAN_ONE_DAY_CAPTURE_LIMIT - this.captured.length
    if (remaining <= 0) { this.didTruncate = true; return }
    this.captured += value.slice(0, remaining)
    if (value.length > remaining) this.didTruncate = true
  }
}

async function persistReceipt(context: GreenCleanOneDayReceiptContext, receipt: GreenCleanOneDayExecutionReceipt): Promise<void> {
  context.finalizedReceipt = receipt
  try {
    await context.persist(context.receiptFilePath, receipt)
    context.receiptPersisted = true
  } catch (error) {
    const message = sanitizeGreenCleanOneDayText(error instanceof Error ? error.message : "UNKNOWN", context.sensitiveValues)
    context.stderr.write(`GREEN_CLEAN_ONE_DAY_RECEIPT_WRITE_FAILED:${message}\n`)
  }
}

function receipt(input: {
  readonly context: GreenCleanOneDayReceiptContext
  readonly cwd: string
  readonly command: string | null
  readonly args: readonly string[]
  readonly childStartAttempted: boolean
  readonly childStartSucceeded: boolean
  readonly childPid: number | null
  readonly exitCode: number | null
  readonly signal: NodeJS.Signals | null
  readonly spawnError: NodeJS.ErrnoException | null
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly classification: GreenCleanOneDayExecutionReceipt["finalClassification"]
}): GreenCleanOneDayExecutionReceipt {
  const { context } = input
  return Object.freeze({
    receiptVersion: GREEN_CLEAN_ONE_DAY_RECEIPT_VERSION,
    invocationId: context.invocationId,
    startedAt: context.startedAt,
    completedAt: context.now(),
    parentPid: context.parentPid,
    childStartAttempted: input.childStartAttempted,
    childStartSucceeded: input.childStartSucceeded,
    childPid: input.childPid,
    executableIdentity: input.command ? path.basename(input.command) : null,
    redactedArgumentList: redactGreenCleanOneDayArguments(input.args, context.sensitiveValues),
    cwd: path.resolve(input.cwd),
    childExitCode: input.exitCode,
    childSignal: input.signal,
    spawnErrorCode: input.spawnError?.code ?? null,
    spawnErrorMessage: input.spawnError ? sanitizeGreenCleanOneDayText(input.spawnError.message, context.sensitiveValues) : null,
    stdout: input.stdout,
    stderr: input.stderr,
    stdoutTruncated: input.stdoutTruncated,
    stderrTruncated: input.stderrTruncated,
    captureLimitCharactersPerStream: GREEN_CLEAN_ONE_DAY_CAPTURE_LIMIT,
    finalClassification: input.classification,
    receiptFilePath: context.receiptFilePath,
  })
}

function quoteWindowsCommandToken(value: string): string {
  if (!value || /[\r\n"%&|<>^!]/.test(value)) throw new Error("GREEN_CLEAN_WINDOWS_COMMAND_TOKEN_INVALID")
  return `"${value}"`
}

export function createGreenCleanWindowsCommandLine(command: string, args: readonly string[]): string {
  return `"${[command, ...args].map(quoteWindowsCommandToken).join(" ")}"`
}

export async function launchGreenCleanWindowsCommand(input: {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly environment: NodeJS.ProcessEnv
  readonly receiptContext?: GreenCleanOneDayReceiptContext
}): Promise<GreenCleanWindowsCommandResult> {
  const context = input.receiptContext ?? createGreenCleanOneDayReceiptContext({ cwd: input.cwd, environment: input.environment })
  const commandLine = createGreenCleanWindowsCommandLine(input.command, input.args)
  return new Promise((resolve, reject) => {
    const stdout = new BoundedForwardingCapture(context.stdout, context.sensitiveValues)
    const stderr = new BoundedForwardingCapture(context.stderr, context.sensitiveValues)
    let childStartSucceeded = false
    let settled = false
    let child: ReturnType<typeof spawn>
    try {
      child = spawn("cmd.exe", ["/d", "/s", "/c", commandLine], {
        cwd: input.cwd,
        env: input.environment,
        windowsHide: true,
        windowsVerbatimArguments: true,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      })
    } catch (error) {
      const spawnError = error as NodeJS.ErrnoException
      const visible = sanitizeGreenCleanOneDayText(spawnError.message, context.sensitiveValues)
      context.stderr.write(`GREEN_CLEAN_ONE_DAY_CHILD_SPAWN_FAILED:${spawnError.code ?? "UNKNOWN"}:${visible}\n`)
      const value = receipt({ context, cwd: input.cwd, command: input.command, args: input.args, childStartAttempted: true, childStartSucceeded: false, childPid: null, exitCode: null, signal: null, spawnError, stdout: "", stderr: "", stdoutTruncated: false, stderrTruncated: false, classification: "SPAWN_FAILURE" })
      void persistReceipt(context, value).then(() => reject(spawnError))
      return
    }
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout.append(chunk) })
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr.append(chunk) })
    child.once("spawn", () => { childStartSucceeded = true })
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (settled) return
      settled = true
      stdout.flush()
      stderr.flush()
      const visible = sanitizeGreenCleanOneDayText(error.message, context.sensitiveValues)
      context.stderr.write(`GREEN_CLEAN_ONE_DAY_CHILD_SPAWN_FAILED:${error.code ?? "UNKNOWN"}:${visible}\n`)
      const value = receipt({ context, cwd: input.cwd, command: input.command, args: input.args, childStartAttempted: true, childStartSucceeded, childPid: child.pid ?? null, exitCode: null, signal: null, spawnError: error, stdout: stdout.value(), stderr: stderr.value(), stdoutTruncated: stdout.truncated(), stderrTruncated: stderr.truncated(), classification: "SPAWN_FAILURE" })
      void persistReceipt(context, value).then(() => reject(error))
    })
    child.once("close", (exitCode, signal) => {
      if (settled) return
      settled = true
      stdout.flush()
      stderr.flush()
      const value = receipt({ context, cwd: input.cwd, command: input.command, args: input.args, childStartAttempted: true, childStartSucceeded, childPid: child.pid ?? null, exitCode, signal, spawnError: null, stdout: stdout.value(), stderr: stderr.value(), stdoutTruncated: stdout.truncated(), stderrTruncated: stderr.truncated(), classification: exitCode === 0 ? "SUCCESS" : "CHILD_NONZERO_EXIT" })
      void persistReceipt(context, value).then(() => resolve(Object.freeze({ exitCode, signal, stdout: stdout.value(), stderr: stderr.value(), stdoutTruncated: stdout.truncated(), stderrTruncated: stderr.truncated(), childPid: child.pid ?? null })))
    })
  })
}

export async function ensureGreenCleanOneDayFailureReceipt(
  context: GreenCleanOneDayReceiptContext,
  error: unknown,
  cwd: string = process.cwd(),
): Promise<void> {
  const message = sanitizeGreenCleanOneDayText(error instanceof Error ? error.message : "GREEN_CLEAN_REBUILD_FAILED", context.sensitiveValues)
  if (context.finalizedReceipt?.finalClassification === "SUCCESS") {
    const value = Object.freeze({
      ...context.finalizedReceipt,
      completedAt: context.now(),
      stderr: `${context.finalizedReceipt.stderr}${message}\n`,
      finalClassification: "PARENT_FAILURE" as const,
    })
    context.receiptPersisted = false
    await persistReceipt(context, value)
    return
  }
  if (context.receiptPersisted) return
  if (context.finalizedReceipt) {
    await persistReceipt(context, context.finalizedReceipt)
    return
  }
  const value = receipt({ context, cwd, command: null, args: [], childStartAttempted: false, childStartSucceeded: false, childPid: null, exitCode: null, signal: null, spawnError: null, stdout: "", stderr: `${message}\n`, stdoutTruncated: false, stderrTruncated: false, classification: "PARENT_FAILURE" })
  await persistReceipt(context, value)
}
