import { deserializeProductContext, serializeProductContext } from "@/lib/product-context/serialize"
import type {
  ProductContextResult,
  SharedProductContextV1,
} from "@/lib/product-context/types"

export const PRODUCT_CONTEXT_STORAGE_KEY_PREFIX = "quantterminal.product-context.v1:"

export interface SavedProductContext {
  contextId: string
  key: string
}

export interface ClearedProductContext {
  contextId: string
  key: string
}

function storageKey(contextId: string) {
  return `${PRODUCT_CONTEXT_STORAGE_KEY_PREFIX}${contextId}`
}

function resolveSessionStorage(): ProductContextResult<Storage> {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: {
        code: "storage_unavailable",
        message: "sessionStorage is unavailable during server-side rendering.",
      },
    }
  }

  try {
    return { success: true, value: window.sessionStorage }
  } catch (cause) {
    return {
      success: false,
      error: {
        code: "storage_unavailable",
        message: "sessionStorage is not available in this browser context.",
        cause,
      },
    }
  }
}

export function productContextStorageKey(contextId: string) {
  return storageKey(contextId)
}

export function saveProductContext(
  context: SharedProductContextV1,
): ProductContextResult<SavedProductContext> {
  const serialized = serializeProductContext(context)
  if (serialized.success === false) return { success: false, error: serialized.error }

  const storage = resolveSessionStorage()
  if (storage.success === false) return { success: false, error: storage.error }

  const key = storageKey(context.contextId)
  try {
    storage.value.setItem(key, serialized.value)
    return { success: true, value: { contextId: context.contextId, key } }
  } catch (cause) {
    return {
      success: false,
      error: {
        code: "storage_failure",
        message: "Product context could not be saved to sessionStorage.",
        cause,
      },
    }
  }
}

export function loadProductContext(
  contextId: string,
): ProductContextResult<SharedProductContextV1> {
  if (!contextId.trim()) {
    return {
      success: false,
      error: { code: "missing_field", message: "contextId is required.", field: "contextId" },
    }
  }

  const storage = resolveSessionStorage()
  if (storage.success === false) return { success: false, error: storage.error }

  const key = storageKey(contextId)
  try {
    const raw = storage.value.getItem(key)
    if (raw === null) {
      return {
        success: false,
        error: {
          code: "not_found",
          message: "Product context was not found in sessionStorage.",
          field: "contextId",
        },
      }
    }
    return deserializeProductContext(raw)
  } catch (cause) {
    return {
      success: false,
      error: {
        code: "storage_failure",
        message: "Product context could not be loaded from sessionStorage.",
        cause,
      },
    }
  }
}

export function clearProductContext(
  contextId: string,
): ProductContextResult<ClearedProductContext> {
  if (!contextId.trim()) {
    return {
      success: false,
      error: { code: "missing_field", message: "contextId is required.", field: "contextId" },
    }
  }

  const storage = resolveSessionStorage()
  if (storage.success === false) return { success: false, error: storage.error }

  const key = storageKey(contextId)
  try {
    storage.value.removeItem(key)
    return { success: true, value: { contextId, key } }
  } catch (cause) {
    return {
      success: false,
      error: {
        code: "storage_failure",
        message: "Product context could not be cleared from sessionStorage.",
        cause,
      },
    }
  }
}
