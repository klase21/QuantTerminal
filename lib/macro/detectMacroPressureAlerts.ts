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
        x.symbol === symbol ||
        x.label === symbol
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