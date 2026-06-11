import * as cheerio from "cheerio"

export type EtfFlowRow = {
  asset: "BTC" | "ETH"
  latestDate: string
  netFlow: number
  unit: "USD millions"
  sourceUrl: string
  trend1d?: "UP" | "DOWN" | "FLAT"
}

export type EtfFlowSnapshot = {
  ok: boolean
  source: "farside-investors"
  updatedAt: string
  flows: EtfFlowRow[]
  unavailableReason?: string
}

const REQUEST_TIMEOUT_MS = 8500

const ETF_SOURCES = [
  { asset: "BTC" as const, url: "https://farside.co.uk/btc/" },
  { asset: "ETH" as const, url: "https://farside.co.uk/eth/" },
]

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
  const parsedRows: Array<{ date: string; flow: number }> = []

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
    parsedRows.push({
      date: dateCell,
      flow: numericCells[numericCells.length - 1],
    })
  }

  const latest = parsedRows[0]
  if (!latest) return null

  return {
    asset,
    latestDate: latest.date,
    netFlow: latest.flow,
    unit: "USD millions",
    sourceUrl: url,
    trend1d: trendFromRows(latest.flow, parsedRows[1]?.flow),
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

  return {
    ok: flows.length > 0,
    source: "farside-investors",
    updatedAt: new Date().toISOString(),
    flows,
    unavailableReason: flows.length ? undefined : failures[0] ?? "Farside ETF flow table shape was not parseable.",
  }
}
