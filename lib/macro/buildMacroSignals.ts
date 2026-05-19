// ======================================================
// lib/macro/buildMacroSignals.ts
// ======================================================

export function buildMacroSignals(
  items: any[]
) {

  const bullish: any[] = []

  const bearish: any[] = []

  function find(
    symbol: string
  ) {

    return items.find(
      (x) =>
        x.symbol === symbol
    )

  }

  const dxy =
    find("DX-Y.NYB")

  const us10y =
    find("^TNX")

  const nasdaq =
    find("^IXIC")

  const gold =
    find("GC=F")

  const oil =
    find("CL=F")

  const btc =
    find("BTC-USD")

  // ======================================================
  // DXY
  // ======================================================

  if (
    dxy?.changePercent < 0
  ) {

    bullish.push({

      label:
        "DXY Weakness",

      message:
        "Dollar falling",

      bias:
        "bullish",

    })

  }

  if (
    dxy?.changePercent > 0
  ) {

    bearish.push({

      label:
        "DXY Strength",

      message:
        "Dollar rising",

      bias:
        "bearish",

    })

  }

  // ======================================================
  // US10Y
  // ======================================================

  if (
    us10y?.changePercent > 1
  ) {

    bearish.push({

      label:
        "Bond Yield Spike",

      message:
        "Rates pressuring risk",

      bias:
        "bearish",

    })

  }

  // ======================================================
  // NASDAQ
  // ======================================================

  if (
    nasdaq?.changePercent > 1
  ) {

    bullish.push({

      label:
        "NASDAQ Strength",

      message:
        "Tech risk appetite",

      bias:
        "bullish",

    })

  }

  // ======================================================
  // GOLD
  // ======================================================

  if (
    gold?.changePercent > 1
  ) {

    bearish.push({

      label:
        "Gold Bid",

      message:
        "Defensive positioning",

      bias:
        "bearish",

    })

  }

  // ======================================================
  // OIL
  // ======================================================

  if (
    oil?.changePercent > 2
  ) {

    bearish.push({

      label:
        "Oil Surge",

      message:
        "Inflation pressure",

      bias:
        "bearish",

    })

  }

  // ======================================================
  // BTC
  // ======================================================

  if (
    btc?.changePercent > 2
  ) {

    bullish.push({

      label:
        "BTC Momentum",

      message:
        "Crypto risk-on",

      bias:
        "bullish",

    })

  }

  return {

    bullish,

    bearish,

    all: [

      ...bullish,

      ...bearish,

    ],

  }

}