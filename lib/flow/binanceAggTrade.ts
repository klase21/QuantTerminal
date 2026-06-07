export type BinanceAggTradeLike = {
  p?: string | number
  q?: string | number
  m?: boolean
  T?: number
  E?: number
  a?: number
}

export type SignedTradeVolume = {
  price: number
  quantity: number
  quoteVolume: number
  side: "buy" | "sell"
  signedBaseVolume: number
  signedQuoteVolume: number
  timestamp: number
}

export function parseBinanceAggTradeVolume(trade: BinanceAggTradeLike): SignedTradeVolume | null {
  const price = Number(trade.p)
  const quantity = Number(trade.q)

  if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  // Binance aggTrade:
  // m === true  => buyer is maker, sell-initiated trade
  // m === false => buyer is taker, buy-initiated trade
  const isSellInitiated = trade.m === true
  const side: "buy" | "sell" = isSellInitiated ? "sell" : "buy"
  const signedBaseVolume = side === "buy" ? quantity : -quantity
  const quoteVolume = price * quantity
  const signedQuoteVolume = price * signedBaseVolume

  return {
    price,
    quantity,
    quoteVolume,
    side,
    signedBaseVolume,
    signedQuoteVolume,
    timestamp: Number(trade.T ?? trade.E ?? Date.now()),
  }
}
