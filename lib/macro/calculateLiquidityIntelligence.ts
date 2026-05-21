// ======================================================
// lib/macro/calculateLiquidityIntelligence.ts
// DXY / US10Y / NASDAQ based liquidity regime model
// ======================================================

export type LiquidityRegime =
  | "RISK_ON"
  | "NEUTRAL"
  | "RISK_OFF"

export type LiquidityDriver = {
  label: string
  value: string
  impact: "positive" | "negative" | "neutral"
  description: string
}

export type LiquidityIntelligence = {
  score: number
  regime: LiquidityRegime
  pressure: number
  drivers: LiquidityDriver[]
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, value)
  )
}

function findMacroItem(
  items: any[],
  symbol: string
) {
  return items.find(
    (item) =>
      item?.symbol === symbol ||
      item?.label === symbol
  )
}

function formatPercent(
  value: number | undefined
) {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return "n/a"
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function calculateLiquidityIntelligence(
  input: any
): LiquidityIntelligence {

  const items =
    Array.isArray(input)
      ? input
      : Array.isArray(input?.items)
        ? input.items
        : []


  const dxy =
    findMacroItem(items, "DX-Y.NYB") ||
    findMacroItem(items, "DXY")

  const us10y =
    findMacroItem(items, "^TNX") ||
    findMacroItem(items, "US10Y")

  const nasdaq =
    findMacroItem(items, "^IXIC") ||
    findMacroItem(items, "NASDAQ")

  const spx =
    findMacroItem(items, "^GSPC") ||
    findMacroItem(items, "SPX")

  const btc =
    findMacroItem(items, "BTC-USD") ||
    findMacroItem(items, "BTC")

  const eth =
    findMacroItem(items, "ETH-USD") ||
    findMacroItem(items, "ETH")

  let rawScore = 50

  const drivers: LiquidityDriver[] = []

  // ======================================================
  // DXY
  // Dollar weakness improves risk liquidity.
  // Dollar strength drains crypto/risk appetite.
  // ======================================================

  if (
    typeof dxy?.changePercent === "number"
  ) {
    const change =
      dxy.changePercent

    const contribution =
      clamp(-change * 12, -18, 18)

    rawScore += contribution

    drivers.push({
      label: "DXY",
      value: formatPercent(change),
      impact:
        change < -0.15
          ? "positive"
          : change > 0.15
            ? "negative"
            : "neutral",
      description:
        change < -0.15
          ? "Dollar weakness supports crypto liquidity"
          : change > 0.15
            ? "Dollar strength tightens risk liquidity"
            : "Dollar pressure is neutral",
    })
  }

  // ======================================================
  // US10Y
  // Falling yields support duration/risk assets.
  // Rising yields pressure crypto and tech.
  // ======================================================

  if (
    typeof us10y?.changePercent === "number"
  ) {
    const change =
      us10y.changePercent

    const contribution =
      clamp(-change * 8, -18, 18)

    rawScore += contribution

    drivers.push({
      label: "US10Y",
      value: formatPercent(change),
      impact:
        change < -0.25
          ? "positive"
          : change > 0.25
            ? "negative"
            : "neutral",
      description:
        change < -0.25
          ? "Yield relief improves liquidity conditions"
          : change > 0.25
            ? "Yield pressure tightens liquidity conditions"
            : "Rates are not driving liquidity strongly",
    })
  }

  // ======================================================
  // NASDAQ
  // Tech strength is used as a risk appetite proxy.
  // ======================================================

  if (
    typeof nasdaq?.changePercent === "number"
  ) {
    const change =
      nasdaq.changePercent

    const contribution =
      clamp(change * 10, -16, 16)

    rawScore += contribution

    drivers.push({
      label: "NASDAQ",
      value: formatPercent(change),
      impact:
        change > 0.25
          ? "positive"
          : change < -0.25
            ? "negative"
            : "neutral",
      description:
        change > 0.25
          ? "Tech bid confirms risk-on liquidity"
          : change < -0.25
            ? "Tech weakness confirms risk-off liquidity"
            : "Tech risk appetite is neutral",
    })
  }

  // ======================================================
  // SPX
  // Broad equity confirmation.
  // ======================================================

  if (
    typeof spx?.changePercent === "number"
  ) {
    const change =
      spx.changePercent

    const contribution =
      clamp(change * 6, -10, 10)

    rawScore += contribution

    drivers.push({
      label: "SPX",
      value: formatPercent(change),
      impact:
        change > 0.2
          ? "positive"
          : change < -0.2
            ? "negative"
            : "neutral",
      description:
        change > 0.2
          ? "Broad market confirms liquidity support"
          : change < -0.2
            ? "Broad market confirms liquidity pressure"
            : "Broad equity liquidity signal is neutral",
    })
  }

  // ======================================================
  // Crypto confirmation
  // BTC / ETH are not primary liquidity inputs,
  // but they confirm whether liquidity is reaching crypto.
  // ======================================================

  if (
    typeof btc?.changePercent === "number"
  ) {
    const change =
      btc.changePercent

    const contribution =
      clamp(change * 5, -10, 10)

    rawScore += contribution

    drivers.push({
      label: "BTC",
      value: formatPercent(change),
      impact:
        change > 0.35
          ? "positive"
          : change < -0.35
            ? "negative"
            : "neutral",
      description:
        change > 0.35
          ? "Crypto liquidity is expanding into BTC"
          : change < -0.35
            ? "Crypto liquidity is not absorbing pressure"
            : "BTC confirmation is muted",
    })
  }

  if (
    typeof eth?.changePercent === "number"
  ) {
    const change =
      eth.changePercent

    const contribution =
      clamp(change * 4, -8, 8)

    rawScore += contribution

    drivers.push({
      label: "ETH",
      value: formatPercent(change),
      impact:
        change > 0.35
          ? "positive"
          : change < -0.35
            ? "negative"
            : "neutral",
      description:
        change > 0.35
          ? "ETH confirms alt liquidity support"
          : change < -0.35
            ? "ETH weakness signals alt liquidity stress"
            : "ETH liquidity confirmation is neutral",
    })
  }

  const score =
    Math.round(
      clamp(rawScore, 0, 100)
    )

  const regime: LiquidityRegime =
    score >= 62
      ? "RISK_ON"
      : score <= 38
        ? "RISK_OFF"
        : "NEUTRAL"

  const pressure =
    Math.round(100 - score)

  return {
    score,
    regime,
    pressure,
    drivers: drivers.slice(0, 6),
  }
}
