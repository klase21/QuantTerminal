
function matchesMacroSymbol(
  item: any,
  symbol: string
) {
  const candidates = [
    item?.symbol,
    item?.label,
  ]

  const aliases: Record<string, string[]> = {
    "DX-Y.NYB": ["DXY", "TVC:DXY"],
    "^TNX": ["US10Y", "TVC:US10Y"],
    "^IXIC": ["NASDAQ", "NASDAQ:NDX"],
    "^GSPC": ["SPX", "S&P500", "SP:SPX"],
    "GC=F": ["GOLD", "COMEX:GC1!"],
    "CL=F": ["OIL", "NYMEX:CL1!"],
    "BTC-USD": ["BTC", "BINANCE:BTCUSDT"],
    "ETH-USD": ["ETH", "BINANCE:ETHUSDT"],
    "TOTAL3": ["CRYPTOCAP:TOTAL3"],
  }

  const targets = [
    symbol,
    ...(aliases[symbol] || []),
  ]

  return candidates.some(
    (value) =>
      targets.includes(value)
  )
}


// ======================================================
// lib/macro/detectRiskMode.ts
// ======================================================

export interface RiskResult {

  mode:
    | "RISK_ON"
    | "NEUTRAL"
    | "RISK_OFF"

  score: number

  signals: string[]

}

export function detectRiskMode(
  input: any
): RiskResult {

  const items =
    Array.isArray(input)
      ? input
      : Array.isArray(input?.items)
        ? input.items
        : []


  let score = 0

  const signals: string[] = []

  const find = (
    symbol: string
  ) =>
    items.find(
      (i) =>
        matchesMacroSymbol(
          i,
          symbol
        )
    )

  const dxy =
    find("DX-Y.NYB")

  const us10y =
    find("^TNX")

  const nasdaq =
    find("^IXIC")

  const gold =
    find("GC=F")

  // ======================================================
  // DXY
  // ======================================================

  if (dxy) {

    if (
      dxy.changePercent < 0
    ) {

      score += 2

      signals.push(
        "Weak DXY supports crypto"
      )

    } else {

      score -= 2

      signals.push(
        "Strong DXY pressures BTC"
      )

    }

  }

  // ======================================================
  // US10Y
  // ======================================================

  if (us10y) {

    if (
      us10y.changePercent > 1
    ) {

      score -= 2

      signals.push(
        "Rising yields pressure tech"
      )

    }

    if (
      us10y.changePercent < -1
    ) {

      score += 2

      signals.push(
        "Falling yields bullish risk"
      )

    }

  }

  // ======================================================
  // NASDAQ
  // ======================================================

  if (nasdaq) {

    if (
      nasdaq.changePercent > 1
    ) {

      score += 2

      signals.push(
        "NASDAQ strong"
      )

    }

    if (
      nasdaq.changePercent < -1
    ) {

      score -= 2

      signals.push(
        "NASDAQ weak"
      )

    }

  }

  // ======================================================
  // GOLD
  // ======================================================

  if (gold) {

    if (
      gold.changePercent > 1
    ) {

      score -= 1

      signals.push(
        "Gold bid indicates fear"
      )

    }

  }

  // ======================================================
  // FINAL
  // ======================================================

  let mode:
    | "RISK_ON"
    | "NEUTRAL"
    | "RISK_OFF" =
      "NEUTRAL"

  if (score >= 3) {

    mode = "RISK_ON"

  } else if (
    score <= -3
  ) {

    mode = "RISK_OFF"

  }

  return {

    mode,

    score,

    signals,

  }

}