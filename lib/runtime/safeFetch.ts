export type SafeFetchStatus = "idle" | "loading" | "success" | "error" | "timeout" | "aborted"

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  label?: string
}

export interface SafeFetchResult<T> {
  ok: boolean
  status: SafeFetchStatus
  data: T | null
  error: string | null
  httpStatus?: number
  durationMs: number
  attempts: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export async function safeFetchJson<T>(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult<T>> {
  const startedAt = Date.now()
  const timeoutMs = options.timeoutMs ?? 8000
  const retries = Math.max(0, options.retries ?? 1)
  const retryDelayMs = options.retryDelayMs ?? 450
  let lastError: string | null = null
  let lastHttpStatus: number | undefined

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const externalSignal = options.signal
    let externalAbortHandler: (() => void) | null = null

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort()
      externalAbortHandler = () => controller.abort()
      externalSignal.addEventListener("abort", externalAbortHandler, { once: true })
    }

    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        cache: options.cache ?? "no-store",
        signal: controller.signal,
        headers: {
          accept: "application/json,text/plain,*/*",
          ...(options.headers ?? {}),
        },
      })
      lastHttpStatus = response.status
      if (!response.ok) throw new Error(`${options.label ?? url} returned HTTP ${response.status}`)
      const data = await response.json() as T
      return {
        ok: true,
        status: "success",
        data,
        error: null,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        attempts: attempt + 1,
      }
    } catch (error) {
      const aborted = isAbortError(error)
      lastError = aborted ? `${options.label ?? url} timed out after ${timeoutMs}ms` : error instanceof Error ? error.message : String(error)
      if (externalSignal?.aborted) {
        return {
          ok: false,
          status: "aborted",
          data: null,
          error: lastError,
          httpStatus: lastHttpStatus,
          durationMs: Date.now() - startedAt,
          attempts: attempt + 1,
        }
      }
      if (attempt < retries) await sleep(retryDelayMs * (attempt + 1))
    } finally {
      clearTimeout(timer)
      if (externalSignal && externalAbortHandler) externalSignal.removeEventListener("abort", externalAbortHandler)
    }
  }

  return {
    ok: false,
    status: lastError?.includes("timed out") ? "timeout" : "error",
    data: null,
    error: lastError ?? "Unknown fetch failure",
    httpStatus: lastHttpStatus,
    durationMs: Date.now() - startedAt,
    attempts: retries + 1,
  }
}

export function capArray<T>(items: T[], maxItems: number) {
  if (!Array.isArray(items)) return []
  if (items.length <= maxItems) return items
  return items.slice(items.length - maxItems)
}
