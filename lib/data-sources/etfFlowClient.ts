import * as cheerio from "cheerio"

export type EtfFlowRow = {
  asset: "BTC" | "ETH"
  latestDate: string
  sourceDate: string
  sourceTimestamp: string
  netFlow: number
  unit: "USD millions"
  sourceUrl: string
  trend1d?: "UP" | "DOWN" | "FLAT"
  isStale: boolean
  staleReason?: string
}

export type EtfFlowSnapshot = {
  ok: boolean
  source: "farside-investors"
  updatedAt: string
  flows: EtfFlowRow[]
  btcFlow?: number | null
  ethFlow?: number | null
  btcSourceDate?: string | null
  ethSourceDate?: string | null
  sourceUrl?: string
  isStale: boolean
  staleReason?: string
  unavailableReason?: string
}

const REQUEST_TIMEOUT_MS = 8500

const ETF_SOURCES = [
  { asset: "BTC" as const, url: "https://farside.co.uk/btc/" },
  { asset: "ETH" as const, url: "https://farside.co.uk/eth/" },
]
const MAX_ETF_STALE_DAYS = 7

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

function parseFlowNumber(value: string) {
  const cleaned = value
    .replace(/\u2212/g, "-")
    .replace(/[,$]/g, "")
    .replace(/[^\d.\-]/g, "")
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function looksLikeDate(value: string) {
  return /\d{1,2}\s+[A-Za-z]{3,9}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)
}

function parseSourceDate(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim()
  const hasExplicitYear = /\b\d{4}\b/.test(cleaned) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cleaned)
  const candidates = hasExplicitYear
    ? [cleaned]
    : [`${cleaned} ${new Date().getUTCFullYear()}`]

  for (const candidate of candidates) {
    const timestamp = Date.parse(candidate)
    if (Number.isFinite(timestamp)) return timestamp
  }

  const slash = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slash) {
    const [, day, month, rawYear] = slash
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day))
    if (Number.isFinite(timestamp)) return timestamp
  }

  return null
}

function dateStaleness(sourceDate: string, now = Date.now()) {
  const timestamp = parseSourceDate(sourceDate)
  if (timestamp === null) {
    return {
      timestamp: null,
      isStale: true,
      staleReason: `Could not verify ETF source date: ${sourceDate}`,
    }
  }

  const ageDays = Math.floor((now - timestamp) / 86400000)
  if (ageDays < 0) {
    return {
      timestamp,
      isStale: true,
      staleReason: `ETF source date is in the future: ${sourceDate}`,
    }
  }

  if (ageDays > MAX_ETF_STALE_DAYS) {
    return {
      timestamp,
      isStale: true,
      staleReason: `ETF source date is ${ageDays} days old`,
    }
  }

  return { timestamp, isStale: false, staleReason: undefined }
}

async function fetchEtfPage(url: string) {
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: timeout.signal,
      headers: {
        accept: "text/html,*/*",
        "user-agent": "QuantTerminal/1.0",
      },
    })
    if (!response.ok) throw new Error(`${url} returned ${response.status}`)
    return response.text()
  } finally {
    timeout.cancel()
  }
}

function trendFromRows(latest: number, previous?: number) {
  if (!Number.isFinite(previous)) return undefined
  if (latest > (previous ?? 0)) return "UP"
  if (latest < (previous ?? 0)) return "DOWN"
  return "FLAT"
}

function extractLatestFlow(asset: "BTC" | "ETH", url: string, html: string): EtfFlowRow | null {
  const $ = cheerio.load(html)
  const rows: string[][] = []
  const parsedRows: Array<{ date: string; flow: number; timestamp: number }> = []

  $("tr").each((_, row) => {
    const cells = $(row).find("th,td").map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get()
    if (cells.length >= 3) rows.push(cells)
  })

  for (const row of rows) {
    const dateCell = row[0]
    if (!looksLikeDate(dateCell)) continue

    const numericCells = row
      .slice(1)
      .map(parseFlowNumber)
      .filter((value): value is number => value !== null)

    if (numericCells.length === 0) continue
    const freshness = dateStaleness(dateCell)
    if (freshness.timestamp === null) continue
    parsedRows.push({
      date: dateCell,
      flow: numericCells[numericCells.length - 1],
      timestamp: freshness.timestamp,
    })
  }

  const sortedRows = parsedRows.sort((left, right) => right.timestamp - left.timestamp)
  const latest = sortedRows[0]
  if (!latest) return null
  const freshness = dateStaleness(latest.date)

  return {
    asset,
    latestDate: latest.date,
    sourceDate: latest.date,
    sourceTimestamp: new Date(latest.timestamp).toISOString(),
    netFlow: latest.flow,
    unit: "USD millions",
    sourceUrl: url,
    trend1d: trendFromRows(latest.flow, sortedRows[1]?.flow),
    isStale: freshness.isStale,
    staleReason: freshness.staleReason,
  }
}

export async function getEtfFlows(): Promise<EtfFlowSnapshot> {
  const flows: EtfFlowRow[] = []
  const failures: string[] = []

  for (const source of ETF_SOURCES) {
    try {
      const html = await fetchEtfPage(source.url)
      const flow = extractLatestFlow(source.asset, source.url, html)
      if (flow) flows.push(flow)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }
  const verifiedFlows = flows.filter((flow) => !flow.isStale)
  const btc = verifiedFlows.find((flow) => flow.asset === "BTC") ?? null
  const eth = verifiedFlows.find((flow) => flow.asset === "ETH") ?? null
  const staleRows = flows.filter((flow) => flow.isStale)
  const staleReason = staleRows[0]?.staleReason
    ?? (flows.length && !verifiedFlows.length ? "Latest ETF rows could not be verified as fresh." : undefined)

  return {
    ok: verifiedFlows.length > 0,
    source: "farside-investors",
    updatedAt: new Date().toISOString(),
    flows: verifiedFlows,
    btcFlow: btc?.netFlow ?? null,
    ethFlow: eth?.netFlow ?? null,
    btcSourceDate: btc?.sourceDate ?? null,
    ethSourceDate: eth?.sourceDate ?? null,
    sourceUrl: ETF_SOURCES[0].url,
    isStale: verifiedFlows.length === 0 && flows.length > 0,
    staleReason,
    unavailableReason: verifiedFlows.length ? undefined : staleReason ?? failures[0] ?? "Farside ETF flow table shape was not parseable.",
  }
}
