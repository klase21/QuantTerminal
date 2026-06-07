export function formatIntradayAxisTime(rawTime: unknown): string {
  const date = normalizeChartTime(rawTime)
  if (!date) return ""

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

export function formatSmartAxisTime(rawTime: unknown, timeframe = "1m"): string {
  const date = normalizeChartTime(rawTime)
  if (!date) return ""

  const intraday =
    timeframe.endsWith("m") ||
    timeframe === "1h" ||
    timeframe === "2h" ||
    timeframe === "3h"

  if (intraday) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function normalizeChartTime(rawTime: unknown): Date | null {
  if (rawTime == null) return null

  if (typeof rawTime === "number") {
    const ms = rawTime > 10_000_000_000 ? rawTime : rawTime * 1000
    return new Date(ms)
  }

  if (typeof rawTime === "string") {
    const parsed = Date.parse(rawTime)
    if (!Number.isNaN(parsed)) return new Date(parsed)
    return null
  }

  if (typeof rawTime === "object") {
    const value = rawTime as { year?: number; month?: number; day?: number }
    if (value.year && value.month && value.day) {
      return new Date(value.year, value.month - 1, value.day)
    }
  }

  return null
}


// Backward-compatible aliases used by older chart components.
export function formatChartTimeTick(rawTime: unknown, timeframe = "1m"): string {
  return formatSmartAxisTime(rawTime, timeframe)
}

export function formatChartCrosshairTime(rawTime: unknown, timeframe = "1m"): string {
  const date = normalizeChartTime(rawTime)
  if (!date) return ""

  const intraday =
    timeframe.endsWith("m") ||
    timeframe === "1h" ||
    timeframe === "2h" ||
    timeframe === "3h"

  if (intraday) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}
