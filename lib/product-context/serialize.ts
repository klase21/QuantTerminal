import { validateProductContext } from "@/lib/product-context/schema"
import type {
  ProductContextResult,
  SharedProductContextV1,
} from "@/lib/product-context/types"

export function serializeProductContext(
  context: SharedProductContextV1,
): ProductContextResult<string> {
  const validation = validateProductContext(context)
  if (validation.success === false) return { success: false, error: validation.error }

  try {
    const serialized = JSON.stringify(validation.value)
    if (typeof serialized !== "string") {
      return {
        success: false,
        error: {
          code: "serialization_failure",
          message: "Product context could not be serialized.",
        },
      }
    }
    return { success: true, value: serialized }
  } catch (cause) {
    return {
      success: false,
      error: {
        code: "serialization_failure",
        message: "Product context serialization failed.",
        cause,
      },
    }
  }
}

export function deserializeProductContext(raw: string): ProductContextResult<SharedProductContextV1> {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return {
      success: false,
      error: {
        code: "malformed_json",
        message: "Product context is not valid JSON.",
        cause,
      },
    }
  }

  return validateProductContext(parsed)
}
