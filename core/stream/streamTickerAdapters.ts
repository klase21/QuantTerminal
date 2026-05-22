import type { BinanceTicker24h, UpbitTicker } from "@/core/market/realMarketRotation"

export interface BinanceMiniTickerMessage {
  e?: string
  E?: number
  s: string
  c?: string
  o?: string
  h?: string
  l?: string
  v?: string
  q?: string
}

export interface UpbitTickerMessage {
  type?: string
  code?: string
  trade_price?: number
  signed_change_rate?: number
  acc_trade_price_24h?: number
  high_price?: number
  low_price?: number
  timestamp?: number
}

function pctChange(current: number, open: number) {
  if (!Number.isFinite(current) || !Number.isFinite(open) || open <= 0) return "0"
  return (((current - open) / open) * 100).toString()
}

export function miniTickerToBinance24h(message: BinanceMiniTickerMessage): BinanceTicker24h | null {
  if (!message?.s || !message.s.endsWith("USDT")) return null
  const current = Number(message.c)
  const open = Number(message.o)

  return {
    symbol: message.s,
    lastPrice: message.c ?? "0",
    priceChangePercent: pctChange(current, open),
    quoteVolume: message.q ?? "0",
    highPrice: message.h ?? "0",
    lowPrice: message.l ?? "0",
  }
}

export function upbitStreamToTicker(message: UpbitTickerMessage): UpbitTicker | null {
  if (!message?.code || !message.code.startsWith("KRW-")) return null

  return {
    market: message.code,
    trade_price: message.trade_price,
    signed_change_rate: message.signed_change_rate,
    acc_trade_price_24h: message.acc_trade_price_24h,
    high_price: message.high_price,
    low_price: message.low_price,
  }
}
