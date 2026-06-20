import { randomUUID } from "node:crypto"
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises"
import path from "node:path"

import {
  INTELLIGENCE_SCHEDULER_SCHEMA_VERSION,
  type IntelligenceProductionSchedule,
  type IntelligenceSchedulerSkipRecord,
  type IntelligenceSchedulerState,
} from "@/core/intelligence-production"

export const DEFAULT_INTELLIGENCE_SCHEDULER_ROOT = path.join(
  process.cwd(),
  ".data",
  "intelligence",
  "scheduler",
)

const STATE_FILE = "scheduler-state.json"
const LOCK_FILE = "production.lock"
const LAST_SKIP_FILE = "last-skip.json"
const DEFAULT_LOCK_TTL_MS = 6 * 60 * 60 * 1000

interface SchedulerLockRecord {
  jobId: string
  acquiredAt: string
  expiresAt: string
  ownerId: string
}

export interface AcquiredSchedulerLock {
  record: SchedulerLockRecord
  release(): Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT")
}

function isAlreadyExists(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST")
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function isSchedule(value: unknown): value is IntelligenceProductionSchedule {
  return (
    isRecord(value)
    && value.kind === "interval"
    && typeof value.everyMinutes === "number"
    && Number.isInteger(value.everyMinutes)
    && value.everyMinutes > 0
  )
}

function isSchedulerState(value: unknown): value is IntelligenceSchedulerState {
  const statuses = new Set([
    "idle",
    "running",
    "succeeded",
    "partial",
    "failed",
    "skipped",
    "disabled",
  ])
  return (
    isRecord(value)
    && value.schemaVersion === INTELLIGENCE_SCHEDULER_SCHEMA_VERSION
    && typeof value.jobId === "string"
    && typeof value.enabled === "boolean"
    && isSchedule(value.schedule)
    && (
      value.lastRun === null
      || (
        isRecord(value.lastRun)
        && typeof value.lastRun.runId === "string"
        && validDate(value.lastRun.startedAt)
        && (value.lastRun.completedAt === null || validDate(value.lastRun.completedAt))
        && typeof value.lastRun.status === "string"
      )
    )
    && (value.nextRun === null || validDate(value.nextRun))
    && typeof value.status === "string"
    && statuses.has(value.status)
    && validDate(value.updatedAt)
  )
}

function isLockRecord(value: unknown): value is SchedulerLockRecord {
  return (
    isRecord(value)
    && typeof value.jobId === "string"
    && validDate(value.acquiredAt)
    && validDate(value.expiresAt)
    && typeof value.ownerId === "string"
  )
}

function statePath(root: string) {
  return path.join(root, STATE_FILE)
}

function lockPath(root: string) {
  return path.join(root, LOCK_FILE)
}

function lastSkipPath(root: string) {
  return path.join(root, LAST_SKIP_FILE)
}

async function writeJsonAtomic(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  const tempFile = `${file}.${randomUUID()}.tmp`
  await writeFile(tempFile, JSON.stringify(value), "utf8")
  await rename(tempFile, file)
}

async function readJson(file: string) {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

async function writeLock(handle: FileHandle, record: SchedulerLockRecord) {
  await handle.writeFile(JSON.stringify(record), "utf8")
  await handle.sync()
}

export function createDefaultSchedulerState(
  now = new Date(),
  options: {
    jobId?: string
    enabled?: boolean
    everyMinutes?: number
  } = {},
): IntelligenceSchedulerState {
  const everyMinutes = options.everyMinutes ?? 24 * 60
  if (!Number.isInteger(everyMinutes) || everyMinutes <= 0) {
    throw new Error("Scheduler interval must be a positive whole number of minutes.")
  }
  const enabled = options.enabled ?? true
  return {
    schemaVersion: INTELLIGENCE_SCHEDULER_SCHEMA_VERSION,
    jobId: options.jobId ?? "intelligence-production-default",
    enabled,
    schedule: { kind: "interval", everyMinutes },
    lastRun: null,
    nextRun: enabled ? now.toISOString() : null,
    status: enabled ? "idle" : "disabled",
    updatedAt: now.toISOString(),
  }
}

export function nextScheduledRun(schedule: IntelligenceProductionSchedule, from: Date) {
  return new Date(from.getTime() + schedule.everyMinutes * 60 * 1000).toISOString()
}

export class FileIntelligenceSchedulerStore {
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(readonly root: string = DEFAULT_INTELLIGENCE_SCHEDULER_ROOT) {}

  private enqueue(operation: () => Promise<void>) {
    const result = this.mutationQueue.then(operation, operation)
    this.mutationQueue = result.then(() => undefined, () => undefined)
    return result
  }

  async readState() {
    const parsed = await readJson(statePath(this.root))
    if (parsed === null) return null
    if (!isSchedulerState(parsed)) throw new Error("Intelligence scheduler state is invalid.")
    return parsed
  }

  writeState(state: IntelligenceSchedulerState) {
    if (!isSchedulerState(state)) {
      return Promise.reject(new Error("Intelligence scheduler state is invalid."))
    }
    return this.enqueue(() => writeJsonAtomic(statePath(this.root), state))
  }

  async readLastSkip() {
    const parsed = await readJson(lastSkipPath(this.root))
    if (parsed === null) return null
    if (
      !isRecord(parsed)
      || !validDate(parsed.recordedAt)
      || typeof parsed.reason !== "string"
      || typeof parsed.detail !== "string"
    ) {
      throw new Error("Intelligence scheduler skip record is invalid.")
    }
    return parsed as unknown as IntelligenceSchedulerSkipRecord
  }

  recordSkip(record: IntelligenceSchedulerSkipRecord) {
    return this.enqueue(() => writeJsonAtomic(lastSkipPath(this.root), record))
  }

  private async removeStaleLock(now: Date) {
    const parsed = await readJson(lockPath(this.root))
    if (!isLockRecord(parsed)) return false
    if (Date.parse(parsed.expiresAt) > now.getTime()) return false
    try {
      await unlink(lockPath(this.root))
      return true
    } catch (error) {
      if (isMissingFile(error)) return true
      throw error
    }
  }

  async acquireLock(
    jobId: string,
    now = new Date(),
    ttlMs = DEFAULT_LOCK_TTL_MS,
  ): Promise<AcquiredSchedulerLock | null> {
    await mkdir(this.root, { recursive: true })
    let handle: FileHandle
    try {
      handle = await open(lockPath(this.root), "wx")
    } catch (error) {
      if (!isAlreadyExists(error)) throw error
      const removed = await this.removeStaleLock(now)
      if (!removed) return null
      try {
        handle = await open(lockPath(this.root), "wx")
      } catch (retryError) {
        if (isAlreadyExists(retryError)) return null
        throw retryError
      }
    }

    const record: SchedulerLockRecord = {
      jobId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      ownerId: randomUUID(),
    }
    try {
      await writeLock(handle, record)
    } catch (error) {
      await handle.close()
      try {
        await unlink(lockPath(this.root))
      } catch (cleanupError) {
        if (!isMissingFile(cleanupError)) throw cleanupError
      }
      throw error
    }
    let released = false
    return {
      record,
      release: async () => {
        if (released) return
        released = true
        await handle.close()
        try {
          const current = await readJson(lockPath(this.root))
          if (isLockRecord(current) && current.ownerId === record.ownerId) {
            await unlink(lockPath(this.root))
          }
        } catch (error) {
          if (!isMissingFile(error)) throw error
        }
      },
    }
  }
}
