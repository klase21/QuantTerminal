import { NextResponse } from "next/server"
import { loadBinanceHistoricalPositioning } from "@/lib/replay/binanceHistoricalPositioning"

export const runtime = "nodejs"

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase()
  const date = searchParams.get("date") ?? ""
  const hour = Number(searchParams.get("hour") ?? "0")

  if (!/^[A-Z0-9]{5,30}$/.test(symbol)) {
    return NextResponse.json({ ok: false, source: "binance-historical", reason: "Valid symbol is required." }, { status: 400 })
  }
  if (!validDate(date)) {
    return NextResponse.json({ ok: false, source: "binance-historical", reason: "Date must use YYYY-MM-DD." }, { status: 400 })
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ ok: false, source: "binance-historical", reason: "Hour must be an integer from 0 to 23 UTC." }, { status: 400 })
  }

  try {
    return NextResponse.json(await loadBinanceHistoricalPositioning({
      symbol,
      date,
      hour,
    }))
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: "binance-historical",
      symbol,
      funding: [],
      reason: error instanceof Error ? error.message : "Binance historical positioning unavailable.",
    })
  }
}
