import { NextResponse } from "next/server"

import { cryptoHftCoverageStart, isBeforeCryptoHftCoverage, loadCryptoHftDataReplay, type CryptoHftDataset } from "@/lib/replay/cryptoHftDataClient"

export const runtime = "nodejs"

const SUPPORTED_EXCHANGES = new Set(["binance_spot", "binance_futures", "bybit", "hyperliquid", "deribit"])
const SUPPORTED_DATASETS = new Set<CryptoHftDataset>(["trades", "orderbook", "liquidations", "open_interest", "mark_price", "ticker"])

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

function replayWindow(date: string, hour: number) {
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exchange = (searchParams.get("exchange") ?? "binance_spot").toLowerCase()
  const symbol = (searchParams.get("symbol") ?? "").toUpperCase()
  const date = searchParams.get("date") ?? ""
  const hourValue = Number(searchParams.get("hour") ?? "0")
  const datasetsParam = searchParams.get("datasets")
  const datasets = datasetsParam
    ? datasetsParam.split(",").map((item) => item.trim()).filter((item): item is CryptoHftDataset => SUPPORTED_DATASETS.has(item as CryptoHftDataset))
    : undefined

  if (!SUPPORTED_EXCHANGES.has(exchange)) {
    return NextResponse.json({ ok: false, source: "cryptohftdata", reason: `Unsupported exchange: ${exchange}` }, { status: 400 })
  }

  if (!symbol) {
    return NextResponse.json({ ok: false, source: "cryptohftdata", reason: "Symbol is required." }, { status: 400 })
  }

  if (!validDate(date)) {
    return NextResponse.json({ ok: false, source: "cryptohftdata", reason: "Date must use YYYY-MM-DD." }, { status: 400 })
  }

  if (!Number.isInteger(hourValue) || hourValue < 0 || hourValue > 23) {
    return NextResponse.json({ ok: false, source: "cryptohftdata", reason: "Hour must be an integer from 0 to 23 UTC." }, { status: 400 })
  }

  if (datasetsParam && !datasets?.length) {
    return NextResponse.json({ ok: false, source: "cryptohftdata", reason: "No supported datasets requested." }, { status: 400 })
  }

  if (isBeforeCryptoHftCoverage(date)) {
    return NextResponse.json({
      ok: false,
      source: "cryptohftdata",
      exchange,
      symbol,
      window: replayWindow(date, hourValue),
      trades: [],
      book: [],
      liquidations: [],
      funding: [],
      candles: [],
      diagnostics: {
        unavailable: [{ dataset: "provider", reason: `CryptoHFTData replay coverage starts from ${cryptoHftCoverageStart()}.` }],
        errors: [],
      },
    })
  }

  try {
    return NextResponse.json(await loadCryptoHftDataReplay({ exchange, symbol, date, hour: hourValue, datasets }))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error"
    return NextResponse.json({
      ok: false,
      source: "cryptohftdata",
      exchange,
      symbol,
      window: replayWindow(date, hourValue),
      trades: [],
      book: [],
      liquidations: [],
      funding: [],
      candles: [],
      diagnostics: {
        unavailable: [],
        errors: [{ dataset: "provider", message: `Replay provider error: ${message}` }],
      },
    }, { status: 500 })
  }
}
