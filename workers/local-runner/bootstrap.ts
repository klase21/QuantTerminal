import { createCronTriggerAdapter } from "@/lib/cron-adapter"
import { createPersistenceRepository } from "@/lib/persistence/repository"
import { SQLiteStorageAdapter } from "@/lib/persistence/sqlite"
import { createWorkerDispatcher } from "@/lib/worker-runtime"
import {
  createNoOpLocalHandlers,
  createNotImplementedLocalHandlers,
} from "@/workers/local-runner/handlers"
import { createLocalRunnerError, createLocalRunnerResult } from "@/workers/local-runner/result"
import type {
  LocalRunIdentityRegistry,
  LocalRunnerBootstrap,
  LocalRunnerBootstrapOptions,
  LocalRunnerResult,
} from "@/workers/local-runner/types"

function createRunRegistry(): LocalRunIdentityRegistry {
  const runIds = new Set<string>()
  return Object.freeze({
    claim(runId: string) {
      if (runIds.has(runId)) return false
      runIds.add(runId)
      return true
    },
  })
}

export async function bootstrapLocalRunner(
  options: LocalRunnerBootstrapOptions,
): Promise<LocalRunnerResult<LocalRunnerBootstrap>> {
  const handlers = options.handlerMode === "NOT_IMPLEMENTED"
    ? createNotImplementedLocalHandlers()
    : createNoOpLocalHandlers()
  const now = options.now ?? (() => new Date().toISOString())
  const dispatcher = createWorkerDispatcher(handlers)
  if (dispatcher.success === false) {
    return createLocalRunnerResult("EXECUTION_ERROR", dispatcher.errors.map(
      (error) => createLocalRunnerError(error.code, error.message, {
        field: error.field,
        cause: error.cause,
      }),
    ))
  }

  if (options.dryRun) {
    return createLocalRunnerResult("SUCCESS", [], Object.freeze({
      cronAdapter: createCronTriggerAdapter(),
      workerDispatcher: dispatcher.value,
      repository: null,
      storageStatus: "UNAVAILABLE",
      runRegistry: createRunRegistry(),
      now,
      handlerMode: options.handlerMode ?? "NO_OP",
    }))
  }
  if (typeof options.databasePath !== "string" || options.databasePath.trim().length === 0) {
    return createLocalRunnerResult("STORAGE_UNAVAILABLE", [createLocalRunnerError(
      "storage_unavailable",
      "SQLite databasePath is required when dryRun is false.",
      { field: "databasePath" },
    )])
  }

  try {
    const adapter = new SQLiteStorageAdapter(options.databasePath)
    const health = await adapter.healthCheck()
    if (health.status !== "SUCCESS" || health.value.status !== "READY") {
      return createLocalRunnerResult("STORAGE_UNAVAILABLE", [createLocalRunnerError(
        "storage_unavailable",
        "SQLite storage is unavailable for the local run.",
        { cause: health.errors },
      )])
    }
    return createLocalRunnerResult("SUCCESS", [], Object.freeze({
      cronAdapter: createCronTriggerAdapter(),
      workerDispatcher: dispatcher.value,
      repository: createPersistenceRepository(adapter),
      storageStatus: "READY",
      runRegistry: createRunRegistry(),
      now,
      handlerMode: options.handlerMode ?? "NO_OP",
    }))
  } catch {
    return createLocalRunnerResult("STORAGE_UNAVAILABLE", [createLocalRunnerError(
      "storage_unavailable",
      "SQLite storage could not be initialized for the local run.",
    )])
  }
}
