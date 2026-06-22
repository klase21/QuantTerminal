import { createWriteStream } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"

import {
  buildReplayOrderbookCache,
} from "@/workers/replay/buildReplayOrderbookCache"

const DOWNLOAD_BASE_URL = "https://api.cryptohftdata.com/download"

export interface ReplayOrderbookBackfillInput {
  symbol: string
  exchange: string
  date: string
  hour: number
}

function validateInput(input: ReplayOrderbookBackfillInput) {
  const symbol = input.symbol.trim().toUpperCase()
  const exchange = input.exchange.trim().toLowerCase()
  if (!symbol) throw new Error("symbol is required.")
  if (!exchange) throw new Error("exchange is required.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("date must use YYYY-MM-DD.")
  }
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
    throw new Error("hour must be an integer from 0 to 23.")
  }
  return { symbol, exchange, date: input.date, hour: input.hour }
}

function providerFile(input: ReplayOrderbookBackfillInput) {
  return [
    input.exchange,
    input.date,
    String(input.hour).padStart(2, "0"),
    `${input.symbol}_orderbook.parquet.zst`,
  ].join("/")
}

function providerUrl(file: string, apiKey: string) {
  const url = new URL(DOWNLOAD_BASE_URL)
  url.searchParams.set("file", file)
  url.searchParams.set("api_key", apiKey)
  return url
}

function loadLocalEnvironment() {
  if (process.env.CRYPTOHFTDATA_API_KEY) return
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"))
  } catch {
    // The explicit environment variable remains the supported fallback.
  }
}

async function downloadProviderFile(
  input: ReplayOrderbookBackfillInput,
  destination: string,
) {
  loadLocalEnvironment()
  const apiKey = process.env.CRYPTOHFTDATA_API_KEY
  if (!apiKey) throw new Error("CRYPTOHFTDATA_API_KEY is not configured.")

  const file = providerFile(input)
  const url = providerUrl(file, apiKey)
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/octet-stream" },
  })
  if (!response.ok || !response.body) {
    throw new Error(
      `CryptoHFTData orderbook download failed with HTTP ${response.status}.`,
    )
  }
  await pipeline(
    Readable.fromWeb(response.body as never),
    createWriteStream(destination),
  )
  return {
    file,
    bytes: Number(response.headers.get("content-length")) || null,
  }
}

export async function backfillReplayOrderbookCache(
  rawInput: ReplayOrderbookBackfillInput,
) {
  const input = validateInput(rawInput)
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "quantterminal-orderbook-"))
  const temporaryFile = path.join(
    temporaryRoot,
    `${input.symbol}_${input.date}_${String(input.hour).padStart(2, "0")}_orderbook.parquet.zst`,
  )

  try {
    const download = await downloadProviderFile(input, temporaryFile)
    const result = await buildReplayOrderbookCache({
      ...input,
      file: temporaryFile,
    })
    return {
      target: input,
      providerFile: download.file,
      downloadedBytes: download.bytes,
      cache: result.job.target.cache,
      schemaVersion: result.job.target.schemaVersion,
      rowsProcessed: result.metadata.rowsProcessed,
      snapshotRows: result.metadata.snapshotRows,
      updateRows: result.metadata.updateRows,
      generatedAt: result.job.completedAt,
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const symbol = argument("symbol")
  const exchange = argument("exchange")
  const date = argument("date")
  const hour = Number(argument("hour"))
  if (!symbol || !exchange || !date || !Number.isInteger(hour)) {
    throw new Error(
      "Usage: --symbol <symbol> --exchange <exchange> --date <YYYY-MM-DD> --hour <0-23>",
    )
  }

  const result = await backfillReplayOrderbookCache({
    symbol,
    exchange,
    date,
    hour,
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
