type MacroTone = "positive" | "negative" | "neutral"

export type MacroQuote = {
  symbol: string
  label: string
  value: number
  changePercent: number
  change: string
  signal: string
  tone: MacroTone
  source: "stooq"
  updatedAt: number
  sourceDate: string
  sourceTime: string
}

export type MacroSnapshot = {
  ok: boolean
  source: "stooq"
  updatedAt: number
  items: MacroQuote[]
  unavailableReason?: string
}

const STOOQ_QUOTE_URL = "https://stooq.com/q/l/"
const REQUEST_TIMEOUT_MS = 6500

const MACRO_SYMBOLS = [
  {
    label: "DXY",
    candidates: ["dx.f", "dxy"],
    signal: (change: number) => change >= 0 ? "Dollar Strength" : "Dollar Weakness",
    tone: (change: number): MacroTone => change >= 0 ? "negative" : "positive",
  },
  {
    label: "US10Y",
    candidates: ["10yusy.b", "us10y"],
    signal: (change: number) => change >= 0 ? "Rates Pressure" : "Rates Easing",
    tone: (change: number): MacroTone => change >= 0 ? "negative" : "positive",
  },
  {
    label: "VIX",
    candidates: ["vix", "^vix"],
    signal: (change: number) => change >= 0 ? "Market Fear Increasing" : "Market Confidence Improving",
    tone: (change: number): MacroTone => change >= 0 ? "negative" : "positive",
  },
  {
    label: "S&P 500",
    candidates: ["^spx", "spx"],
    signal: (change: number) => change >= 0 ? "Risk-On Sentiment" : "Risk-Off Sentiment",
    tone: (change: number): MacroTone => change >= 0 ? "positive" : "negative",
  },
]

function formatChange(value: number) {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

function parseCsvLine(line: string) {
  const output: string[] = []
  let current = ""
  let quoted = false

  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      output.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  output.push(current.trim())
  return output
}

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

async function fetchStooqQuote(symbol: string) {
  const params = new URLSearchParams({
    s: symbol,
    f: "sd2t2ohlcv",
    h: "",
    e: "csv",
  })
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${STOOQ_QUOTE_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: timeout.signal,
      headers: {
        accept: "text/csv,text/plain,*/*",
        "user-agent": "QuantTerminal/1.0",
      },
    })

    if (!response.ok) throw new Error(`Stooq returned ${response.status}`)

    const text = await response.text()
    const [, dataLine] = text.trim().split(/\r?\n/)
    if (!dataLine || dataLine.includes("N/D")) return null

    const [resolvedSymbol, date, time, open, high, low, close] = parseCsvLine(dataLine)
    const openValue = Number(open)
    const closeValue = Number(close)
    if (!Number.isFinite(openValue) || !Number.isFinite(closeValue) || openValue === 0) return null

    return {
      resolvedSymbol,
      date,
      time,
      open: openValue,
      high: Number(high),
      low: Number(low),
      close: closeValue,
      changePercent: ((closeValue - openValue) / openValue) * 100,
    }
  } finally {
    timeout.cancel()
  }
}

export async function getMacroSnapshot(): Promise<MacroSnapshot> {
  const updatedAt = Date.now()
  const items: MacroQuote[] = []
  const failures: string[] = []

  for (const item of MACRO_SYMBOLS) {
    let quote: Awaited<ReturnType<typeof fetchStooqQuote>> = null

    for (const symbol of item.candidates) {
      try {
        quote = await fetchStooqQuote(symbol)
        if (quote) break
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error))
      }
    }

    if (!quote) continue

    items.push({
      symbol: item.label,
      label: item.label,
      value: quote.close,
      changePercent: quote.changePercent,
      change: formatChange(quote.changePercent),
      signal: item.signal(quote.changePercent),
      tone: item.tone(quote.changePercent),
      source: "stooq",
      updatedAt,
      sourceDate: quote.date,
      sourceTime: quote.time,
    })
  }

  return {
    ok: items.length > 0,
    source: "stooq",
    updatedAt,
    items,
    unavailableReason: items.length ? undefined : failures[0] ?? "No Stooq macro quotes returned.",
  }
}
