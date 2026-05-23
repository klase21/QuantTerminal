export function safeReadStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function safeWriteStorage<T>(key: string, value: T, maxLength = 180000) {
  if (typeof window === "undefined") return false
  try {
    const raw = JSON.stringify(value)
    if (raw.length > maxLength) return false
    window.localStorage.setItem(key, raw)
    return true
  } catch {
    return false
  }
}
