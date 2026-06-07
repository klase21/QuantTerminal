
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
// lib/macro/detectMacroPressureAlerts.ts
// ======================================================

export function detectMacroPressureAlerts(
  input: any
) {

  const items =
    Array.isArray(input)
      ? input
      : Array.isArray(input?.items)
        ? input.items
        : []


  const alerts: any[] = []

  function find(
    symbol: string
  ) {

    return items.find(
      (x) =>
        matchesMacroSymbol(
          x,
          symbol
        )
    )

  }

  const dxy =
    find("DX-Y.NYB")

  const us10y =
    find("^TNX")

  const btc =
    find("BTC-USD")

  // ======================================================
  // DXY vs BTC
  // ======================================================

  if (

    dxy?.changePercent > 0.7 &&

    btc?.changePercent < 0

  ) {

    alerts.push({

      type:
        "bearish",

      message:
        "DXY rising while BTC weakens → crypto pressure",

    })

  }

  // ======================================================
  // US10Y
  // ======================================================

  if (
    us10y?.changePercent > 1.5
  ) {

    alerts.push({

      type:
        "bearish",

      message:
        "US10Y spike detected → growth assets under pressure",

    })

  }

  // ======================================================
  // BTC OUTPERFORM
  // ======================================================

  if (

    dxy?.changePercent < 0 &&

    btc?.changePercent > 2

  ) {

    alerts.push({

      type:
        "bullish",

      message:
        "BTC outperforming weak dollar environment",

    })

  }

  return alerts

}