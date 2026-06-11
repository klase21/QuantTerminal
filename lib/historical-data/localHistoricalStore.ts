import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import path from "node:path"

import type {
  DashboardMarketStateSnapshot,
  HistoricalInterval,
  HistoricalMarketSnapshot,
  IngestionJob,
  MarketOutcome,
  MarketMemoryEvent,
  MarketMemoryEventCategory,
  MarketOhlcvRow,
} from "@/types/historical"

const DATA_DIR = path.join(process.cwd(), ".data", "historical")
const OHLCV_FILE = path.join(DATA_DIR, "market_ohlcv.json")
const JOBS_FILE = path.join(DATA_DIR, "ingestion_jobs.json")
const HISTORICAL_SNAPSHOTS_FILE = path.join(DATA_DIR, "historical_market_snapshots.json")
const MARKET_OUTCOMES_FILE = path.join(DATA_DIR, "market_outcomes.json")
const DASHBOARD_SNAPSHOTS_FILE = path.join(DATA_DIR, "market_state_snapshots.json")
const MARKET_MEMORY_EVENTS_FILE = path.join(DATA_DIR, "market_memory_events.json")

declare global {
  // eslint-disable-next-line no-var
  var __qtHistoricalStoreWriteLock: Promise<void> | undefined
}

async function withWriteLock<T>(work: () => Promise<T>) {
  const previous = globalThis.__qtHistoricalStoreWriteLock ?? Promise.resolve()
  let release: () => void = () => undefined
  globalThis.__qtHistoricalStoreWriteLock = new Promise<void>((resolve) => {
    release = resolve
  })

  await previous
  try {
    return await work()
  } finally {
    release()
  }
}

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  await ensureDir()
  try {
    const text = await readFile(file, "utf8")
    if (!text.trim()) return []
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return []
    throw error
  }
}

async function writeJsonArray<T>(file: string, rows: T[]) {
  await ensureDir()
  const tempFile = `${file}.${randomUUID()}.tmp`
  await writeFile(tempFile, JSON.stringify(rows), "utf8")
  await rename(tempFile, file)
}

export function ohlcvId(source: string, symbol: string, interval: string, openTime: number) {
  return `${source}:${symbol}:${interval}:${openTime}`
}

export function jobId(source: string, dataset: string, symbol: string, interval: string, period: string) {
  return `${source}:${dataset}:${symbol}:${interval}:${period}`
}

export async function getIngestionJob(id: string) {
  const jobs = await readJsonArray<IngestionJob>(JOBS_FILE)
  return jobs.find((job) => job.id === id) ?? null
}

export async function listIngestionJobs() {
  return readJsonArray<IngestionJob>(JOBS_FILE)
}

export async function upsertIngestionJob(job: IngestionJob) {
  return withWriteLock(async () => {
    const jobs = await readJsonArray<IngestionJob>(JOBS_FILE)
    const index = jobs.findIndex((item) => item.id === job.id)
    if (index >= 0) jobs[index] = job
    else jobs.push(job)
    await writeJsonArray(JOBS_FILE, jobs)
    return job
  })
}

export async function upsertOhlcvRows(rows: MarketOhlcvRow[]) {
  if (!rows.length) return 0
  return withWriteLock(async () => {
    const existing = await readJsonArray<MarketOhlcvRow>(OHLCV_FILE)
    const map = new Map(existing.map((row) => [row.id, row]))
    let inserted = 0

    for (const row of rows) {
      if (!map.has(row.id)) inserted += 1
      map.set(row.id, row)
    }

    await writeJsonArray(OHLCV_FILE, Array.from(map.values()).sort((a, b) => a.openTime - b.openTime))
    return inserted
  })
}

export async function listOhlcvRows(symbol: string, interval: HistoricalInterval) {
  const rows = await readJsonArray<MarketOhlcvRow>(OHLCV_FILE)
  return rows
    .filter((row) => row.source === "binance-vision" && row.symbol === symbol && row.interval === interval)
    .sort((a, b) => a.openTime - b.openTime)
}

export async function listAllOhlcvRows() {
  return readJsonArray<MarketOhlcvRow>(OHLCV_FILE)
}

export async function replaceHistoricalSnapshots(symbol: string, interval: HistoricalInterval, snapshots: HistoricalMarketSnapshot[]) {
  return withWriteLock(async () => {
    let existing: HistoricalMarketSnapshot[] = []
    try {
      existing = await readJsonArray<HistoricalMarketSnapshot>(HISTORICAL_SNAPSHOTS_FILE)
    } catch {
      existing = []
    }
    const retained = existing.filter((row) => row.symbol !== symbol || row.interval !== interval)
    await writeJsonArray(HISTORICAL_SNAPSHOTS_FILE, [...retained, ...snapshots].sort((a, b) => a.timestamp - b.timestamp))
    return snapshots.length
  })
}

export async function listHistoricalSnapshots(symbol: string, interval: HistoricalInterval) {
  const rows = await readJsonArray<HistoricalMarketSnapshot>(HISTORICAL_SNAPSHOTS_FILE)
  return rows
    .filter((row) => row.symbol === symbol && row.interval === interval)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export async function listHistoricalSnapshotsByInterval(interval: HistoricalInterval) {
  const rows = await readJsonArray<HistoricalMarketSnapshot>(HISTORICAL_SNAPSHOTS_FILE)
  return rows
    .filter((row) => row.interval === interval)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export async function listAllHistoricalSnapshots() {
  return readJsonArray<HistoricalMarketSnapshot>(HISTORICAL_SNAPSHOTS_FILE)
}

export async function replaceMarketOutcomes(symbol: string, interval: HistoricalInterval, outcomes: MarketOutcome[]) {
  return withWriteLock(async () => {
    const existing = await readJsonArray<MarketOutcome>(MARKET_OUTCOMES_FILE)
    const retained = existing.filter((row) => row.symbol !== symbol || row.interval !== interval)
    await writeJsonArray(MARKET_OUTCOMES_FILE, [...retained, ...outcomes].sort((a, b) => a.timestamp - b.timestamp))
    return outcomes.length
  })
}

export async function replaceAllMarketOutcomes(outcomes: MarketOutcome[]) {
  return withWriteLock(async () => {
    await writeJsonArray(MARKET_OUTCOMES_FILE, [...outcomes].sort((a, b) => a.timestamp - b.timestamp))
    return outcomes.length
  })
}

export async function listMarketOutcomes(interval?: HistoricalInterval) {
  const rows = await readJsonArray<MarketOutcome>(MARKET_OUTCOMES_FILE)
  return rows
    .filter((row) => !interval || row.interval === interval)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export async function recordDashboardSnapshot(snapshot: DashboardMarketStateSnapshot) {
  return withWriteLock(async () => {
    const rows = await readJsonArray<DashboardMarketStateSnapshot>(DASHBOARD_SNAPSHOTS_FILE)
    rows.unshift(snapshot)
    await writeJsonArray(DASHBOARD_SNAPSHOTS_FILE, rows.slice(0, 1000))
    await appendMarketMemoryEvents(snapshot)
    return snapshot
  })
}

export async function latestDashboardSnapshot(symbol: string) {
  const rows = await readJsonArray<DashboardMarketStateSnapshot>(DASHBOARD_SNAPSHOTS_FILE)
  return rows.find((row) => row.symbol === symbol) ?? null
}

export async function listDashboardSnapshots(symbol?: string) {
  const rows = await readJsonArray<DashboardMarketStateSnapshot>(DASHBOARD_SNAPSHOTS_FILE)
  return rows
    .filter((row) => !symbol || row.symbol === symbol)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function listMarketMemoryEvents() {
  const rows = await readJsonArray<MarketMemoryEvent>(MARKET_MEMORY_EVENTS_FILE)
  return rows.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function driverTitle(driver: string) {
  const labels: Record<string, string> = {
    buying_pressure: "Strong Buying Pressure",
    selling_pressure: "Strong Selling Pressure",
    sector_rotation: "Sector Rotation Improving",
    leverage_risk: "Crowded Positioning",
    dollar_strength: "Dollar Strength",
    dollar_weakness: "Dollar Weakness",
    risk_off: "Risk-Off Sentiment",
    risk_on: "Risk-On Sentiment",
    narrative_heat: "Narrative Heat Rising",
    etf_narrative: "ETF Interest Rising",
  }

  return labels[driver] ?? driver.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function categoryForTag(tag: string): MarketMemoryEventCategory {
  if (tag.includes("etf")) return "ETF"
  if (tag.includes("ai")) return "AI"
  if (tag.includes("bitcoin") || tag.includes("btc")) return "BITCOIN"
  if (tag.includes("ethereum") || tag.includes("eth")) return "ETHEREUM"
  if (tag.includes("stablecoin")) return "STABLECOIN"
  if (tag.includes("meme")) return "MEME"
  if (tag.includes("solana") || tag.includes("layer1")) return "LAYER1"
  if (tag.includes("defi")) return "DEFI"
  if (tag.includes("risk_on")) return "RISK_ON"
  if (tag.includes("risk_off")) return "RISK_OFF"
  if (tag.includes("dollar") || tag.includes("macro")) return "MACRO"
  return "MARKET"
}

async function appendMarketMemoryEvents(snapshot: DashboardMarketStateSnapshot) {
  const drivers = parseJsonArray(snapshot.driversJson)
  const narratives = parseJsonArray(snapshot.narrativesJson)
  const tags = Array.from(new Set([
    ...drivers,
    ...narratives,
    snapshot.liquidityState !== "unknown" ? `liquidity_${snapshot.liquidityState}` : null,
    snapshot.etfFlowState !== "unknown" ? `etf_${snapshot.etfFlowState}` : null,
    snapshot.predictionState !== "unknown" ? `prediction_${snapshot.predictionState}` : null,
  ].filter((item): item is string => Boolean(item))))

  const primaryTags = drivers.length ? drivers.slice(0, 3) : narratives.slice(0, 3)
  if (!primaryTags.length) return

  const existing = await readJsonArray<MarketMemoryEvent>(MARKET_MEMORY_EVENTS_FILE)
  const nextEvents = primaryTags.map((tag, index) => {
    const id = `memory:${snapshot.id}:${index}:${tag}`
    const title = driverTitle(tag)
    return {
      id,
      eventDate: snapshot.timestamp,
      title,
      category: categoryForTag(tag),
      tags,
      direction: snapshot.direction,
      description: `${title} in a ${snapshot.direction} dashboard state`,
      createdAt: snapshot.createdAt,
    } satisfies MarketMemoryEvent
  })

  const map = new Map(existing.map((event) => [event.id, event]))
  nextEvents.forEach((event) => map.set(event.id, event))
  await writeJsonArray(MARKET_MEMORY_EVENTS_FILE, Array.from(map.values()).slice(0, 3000))
}
