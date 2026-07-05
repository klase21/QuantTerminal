import { isSchedulerJobType } from "@/lib/scheduler-runtime"
import type {
  WorkerDispatchHandlers,
  WorkerDispatcher,
  WorkerHandlerResult,
  WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"
import {
  validateExecutionError,
  validateWorkerDispatchOutput,
  validateWorkerExecutionContext,
} from "@/lib/worker-runtime/validation"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validateHandlerResult(
  input: unknown,
  executionId: string,
): WorkerRuntimeResult<WorkerHandlerResult> {
  if (!isRecord(input) || typeof input.success !== "boolean") {
    return {
      success: false,
      errors: [{
        code: "malformed_dispatch",
        message: "Worker handler returned a malformed result.",
        field: "handlerResult",
      }],
    }
  }
  if (input.success === true) {
    const output = validateWorkerDispatchOutput(input.value, executionId)
    if (output.success === false) return output
    return { success: true, value: Object.freeze({ success: true, value: output.value }) }
  }
  const error = validateExecutionError(input.error)
  if (error.success === false) return error
  return { success: true, value: Object.freeze({ success: false, error: error.value }) }
}

export function createWorkerDispatcher(
  handlers: WorkerDispatchHandlers,
): WorkerRuntimeResult<WorkerDispatcher> {
  if (!isRecord(handlers)) {
    return {
      success: false,
      errors: [{
        code: "malformed_dispatch",
        message: "Worker dispatch handlers must be a plain object.",
        field: "handlers",
      }],
    }
  }
  for (const [jobType, handler] of Object.entries(handlers)) {
    if (!isSchedulerJobType(jobType) || typeof handler !== "function") {
      return {
        success: false,
        errors: [{
          code: isSchedulerJobType(jobType) ? "malformed_dispatch" : "unsupported_job_type",
          message: "Worker dispatch registry contains an unsupported job or non-function handler.",
          field: `handlers.${jobType}`,
        }],
      }
    }
  }

  const frozenHandlers = Object.freeze({ ...handlers })
  return {
    success: true,
    value: Object.freeze({
      async dispatch(context): Promise<WorkerRuntimeResult<WorkerHandlerResult>> {
        const validation = validateWorkerExecutionContext(context)
        if (validation.success === false) return validation
        const handler = frozenHandlers[validation.value.jobType]
        if (!handler) {
          return {
            success: false as const,
            errors: [{
              code: "malformed_dispatch",
              message: `No handler is registered for ${validation.value.jobType}.`,
              field: "jobType",
            }],
          }
        }
        try {
          return validateHandlerResult(
            await handler(validation.value),
            validation.value.executionId,
          )
        } catch {
          return {
            success: true as const,
            value: Object.freeze({
              success: false,
              error: Object.freeze({
                code: "HANDLER_FAILURE",
                message: "Worker handler failed without a structured result.",
                retryable: false,
              }),
            }),
          }
        }
      },
    }),
  }
}
