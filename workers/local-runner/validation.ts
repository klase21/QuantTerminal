import {
  canonicalCronTimestamp,
  type CronMetadataArray,
  type CronMetadataObject,
  type CronMetadataValue,
} from "@/lib/cron-adapter"
import { isSchedulerJobType, SCHEDULER_JOB_TYPES } from "@/lib/scheduler-runtime"
import { createLocalRunnerError, createLocalRunnerResult } from "@/workers/local-runner/result"
import {
  LOCAL_RUNNER_SCHEMA_VERSION,
  LOCAL_TRIGGER_PROVIDERS,
  type LocalRunRequest,
  type LocalRunnerResult,
} from "@/workers/local-runner/types"

type UnknownRecord = Record<string, unknown>
const LOCAL_PROVIDER_SET = new Set<string>(LOCAL_TRIGGER_PROVIDERS)

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isMetadataValue(
  value: unknown,
  seen: Set<object> = new Set<object>(),
): value is CronMetadataValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value !== "object" || seen.has(value)) return false
  seen.add(value)
  const valid = Array.isArray(value)
    ? value.every((entry) => isMetadataValue(entry, seen))
    : isRecord(value) && Object.values(value).every((entry) => isMetadataValue(entry, seen))
  seen.delete(value)
  return valid
}

function freezeMetadata(value: CronMetadataValue): CronMetadataValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeMetadata)) as CronMetadataArray
  }
  if (value !== null && typeof value === "object") {
    const output: Record<string, CronMetadataValue> = {}
    for (const [key, entry] of Object.entries(value)) output[key] = freezeMetadata(entry)
    return Object.freeze(output) as CronMetadataObject
  }
  return value
}

export function validateLocalRunRequest(input: unknown): LocalRunnerResult<LocalRunRequest> {
  if (!isRecord(input)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_run_request",
      "LocalRunRequest must be a plain object.",
    )])
  }
  if (input.schemaVersion !== LOCAL_RUNNER_SCHEMA_VERSION) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_run_request",
      `Only Local Runner schema version ${LOCAL_RUNNER_SCHEMA_VERSION} is supported.`,
      { field: "schemaVersion" },
    )])
  }
  if (!isNonEmptyString(input.runId)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_run_request",
      "runId must be a non-empty string.",
      { field: "runId" },
    )])
  }
  const requestedAt = canonicalCronTimestamp(input.requestedAt)
  if (!requestedAt) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_timestamp",
      "requestedAt must be a valid timestamp.",
      { field: "requestedAt" },
    )])
  }
  if (typeof input.triggerProvider !== "string"
    || !LOCAL_PROVIDER_SET.has(input.triggerProvider)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "unsupported_provider",
      "Local Runner supports LOCAL and MANUAL trigger providers only.",
      { field: "triggerProvider" },
    )])
  }
  if (!isNonEmptyString(input.executionScope)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "malformed_execution_scope",
      "executionScope must be a non-empty string.",
      { field: "executionScope" },
    )])
  }
  if (!Array.isArray(input.jobTypes)
    || input.jobTypes.length === 0
    || input.jobTypes.some((jobType) => !isSchedulerJobType(jobType))
    || new Set(input.jobTypes).size !== input.jobTypes.length) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "unsupported_job_type",
      `jobTypes must contain unique canonical values: ${SCHEDULER_JOB_TYPES.join(", ")}.`,
      { field: "jobTypes" },
    )])
  }
  if (typeof input.dryRun !== "boolean") {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_dry_run",
      "dryRun must be boolean.",
      { field: "dryRun" },
    )])
  }
  if (!isRecord(input.metadata) || !isMetadataValue(input.metadata)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_run_request",
      "metadata must be an opaque JSON-safe object.",
      { field: "metadata" },
    )])
  }

  return createLocalRunnerResult("SUCCESS", [], Object.freeze({
    schemaVersion: LOCAL_RUNNER_SCHEMA_VERSION,
    runId: input.runId.trim(),
    requestedAt,
    triggerProvider: input.triggerProvider as LocalRunRequest["triggerProvider"],
    executionScope: input.executionScope.trim(),
    jobTypes: Object.freeze([...input.jobTypes]) as LocalRunRequest["jobTypes"],
    dryRun: input.dryRun,
    metadata: freezeMetadata(input.metadata) as CronMetadataObject,
  }))
}

export function validateLocalRunRequests(
  input: unknown,
): LocalRunnerResult<readonly LocalRunRequest[]> {
  if (!Array.isArray(input)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_run_request",
      "Local run requests must be an array.",
    )])
  }
  const requests: LocalRunRequest[] = []
  const runIds = new Set<string>()
  for (const item of input) {
    const validation = validateLocalRunRequest(item)
    if (validation.status !== "SUCCESS" || !validation.value) {
      return createLocalRunnerResult(validation.status, validation.errors)
    }
    if (runIds.has(validation.value.runId)) {
      return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
        "duplicate_run_id",
        "Local run request set contains a duplicate runId.",
        { field: "runId" },
      )])
    }
    runIds.add(validation.value.runId)
    requests.push(validation.value)
  }
  return createLocalRunnerResult("SUCCESS", [], Object.freeze(requests))
}
