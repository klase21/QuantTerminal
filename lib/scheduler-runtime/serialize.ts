import { freezeExecutionPlan } from "@/lib/scheduler-runtime/executionPlan"
import type { ExecutionPlan, SchedulerResult } from "@/lib/scheduler-runtime/types"
import { validateExecutionPlan } from "@/lib/scheduler-runtime/validation"

export function serializeExecutionPlan(plan: ExecutionPlan): SchedulerResult<string> {
  const validation = validateExecutionPlan(plan)
  if (validation.success === false) return validation
  try {
    const raw = JSON.stringify(validation.value)
    if (typeof raw !== "string") {
      return {
        success: false,
        errors: [{ code: "serialization_failure", message: "ExecutionPlan could not be serialized." }],
      }
    }
    return { success: true, value: raw }
  } catch (cause) {
    return {
      success: false,
      errors: [{ code: "serialization_failure", message: "ExecutionPlan serialization failed.", cause }],
    }
  }
}

export function deserializeExecutionPlan(raw: string): SchedulerResult<ExecutionPlan> {
  if (typeof raw !== "string") {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Serialized ExecutionPlan must be a string." }],
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "ExecutionPlan is not valid JSON.", cause }],
    }
  }
  const validation = validateExecutionPlan(parsed)
  if (validation.success === false) return validation
  return { success: true, value: freezeExecutionPlan(validation.value) }
}

