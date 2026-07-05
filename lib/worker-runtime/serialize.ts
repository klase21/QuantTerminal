import { freezeWorkerLifecycle } from "@/lib/worker-runtime/lifecycle"
import { freezeWorkerResult } from "@/lib/worker-runtime/result"
import type {
  WorkerExecutionContext,
  WorkerLifecycle,
  WorkerResult,
  WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"
import {
  validateWorkerExecutionContext,
  validateWorkerLifecycle,
  validateWorkerResult,
} from "@/lib/worker-runtime/validation"

function serializeValidated<T>(
  value: T,
  validate: (input: unknown) => WorkerRuntimeResult<T>,
): WorkerRuntimeResult<string> {
  const validation = validate(value)
  if (validation.success === false) return validation
  try {
    const raw = JSON.stringify(validation.value)
    if (typeof raw !== "string") {
      return {
        success: false,
        errors: [{ code: "serialization_failure", message: "Worker value could not be serialized." }],
      }
    }
    return { success: true, value: raw }
  } catch (cause) {
    return {
      success: false,
      errors: [{ code: "serialization_failure", message: "Worker serialization failed.", cause }],
    }
  }
}

function parse(raw: string): WorkerRuntimeResult<unknown> {
  if (typeof raw !== "string") {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Serialized Worker value must be a string." }],
    }
  }
  try {
    return { success: true, value: JSON.parse(raw) }
  } catch (cause) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Worker value is not valid JSON.", cause }],
    }
  }
}

export function serializeWorkerExecutionContext(
  context: WorkerExecutionContext,
): WorkerRuntimeResult<string> {
  return serializeValidated(context, validateWorkerExecutionContext)
}

export function deserializeWorkerExecutionContext(
  raw: string,
): WorkerRuntimeResult<WorkerExecutionContext> {
  const parsed = parse(raw)
  if (parsed.success === false) return parsed
  return validateWorkerExecutionContext(parsed.value)
}

export function serializeWorkerLifecycle(
  lifecycle: WorkerLifecycle,
): WorkerRuntimeResult<string> {
  return serializeValidated(lifecycle, validateWorkerLifecycle)
}

export function deserializeWorkerLifecycle(raw: string): WorkerRuntimeResult<WorkerLifecycle> {
  const parsed = parse(raw)
  if (parsed.success === false) return parsed
  const validation = validateWorkerLifecycle(parsed.value)
  return validation.success
    ? { success: true, value: freezeWorkerLifecycle(validation.value) }
    : validation
}

export function serializeWorkerResult(result: WorkerResult): WorkerRuntimeResult<string> {
  return serializeValidated(result, validateWorkerResult)
}

export function deserializeWorkerResult(raw: string): WorkerRuntimeResult<WorkerResult> {
  const parsed = parse(raw)
  if (parsed.success === false) return parsed
  const validation = validateWorkerResult(parsed.value)
  return validation.success
    ? { success: true, value: freezeWorkerResult(validation.value) }
    : validation
}
