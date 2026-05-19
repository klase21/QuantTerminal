// ======================================================
// lib/macro/calculateMacroSentiment.ts
// ======================================================

export interface MacroItem {

  symbol: string

  label: string

  price: number

  changePercent: number

}

export interface MacroSentiment {

  score: number

  sentiment:
    | "risk_on"
    | "neutral"
    | "risk_off"

  signals: string[]

}

export function calculateMacroSentiment(
  items: MacroItem[]
): MacroSentiment {

  let score = 0

  const signals: string[] = []

  const find = (
    symbol: string
  ) =>
    items.find(
      (i) =>
        i.symbol === symbol
    )

  const dxy =
    find("DX-Y.NYB")

  const us10y =
    find("^TNX")

  const nasdaq =
    find("^IXIC")

  const spx =
    find("^GSPC")

  const gold =
    find("GC=F")

  const oil =
    find("CL=F")

  // ======================================================
  // DXY
  // ======================================================

  if (dxy) {

    if (dxy.changePercent < 0) {

      score += 2

      signals.push(
        "Weak DXY supports crypto"
      )

    } else {

      score -= 2

      signals.push(
        "Strong DXY pressures risk assets"
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
        "Rising yields pressure equities"
      )

    } else if (
      us10y.changePercent < -1
    ) {

      score += 2

      signals.push(
        "Falling yields support growth"
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
        "NASDAQ bullish"
      )

    } else if (
      nasdaq.changePercent < -1
    ) {

      score -= 2

      signals.push(
        "NASDAQ weak"
      )

    }

  }

  // ======================================================
  // SPX
  // ======================================================

  if (spx) {

    if (
      spx.changePercent > 0.5
    ) {

      score += 1

    } else if (
      spx.changePercent < -0.5
    ) {

      score -= 1

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
  // OIL
  // ======================================================

  if (oil) {

    if (
      oil.changePercent > 2
    ) {

      score -= 1

      signals.push(
        "Oil spike may trigger inflation fears"
      )

    }

  }

  // ======================================================
  // FINAL
  // ======================================================

  let sentiment:
    | "risk_on"
    | "neutral"
    | "risk_off" =
      "neutral"

  if (score >= 3) {

    sentiment =
      "risk_on"

  } else if (
    score <= -3
  ) {

    sentiment =
      "risk_off"

  }

  return {

    score,

    sentiment,

    signals,

  }

}