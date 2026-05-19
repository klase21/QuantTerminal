// ======================================================
// lib/macro/detectRiskMode.ts
// ======================================================

export function detectRiskMode(
  macro: any[]
) {

  const dxy =
    macro.find(
      (m) => m.label === "DXY"
    )

  const us10y =
    macro.find(
      (m) => m.label === "US10Y"
    )

  const nasdaq =
    macro.find(
      (m) => m.label === "NASDAQ"
    )

  if (
    dxy?.changePercent > 0.5 &&
    us10y?.changePercent > 1 &&
    nasdaq?.changePercent < -1
  ) {

    return {
      mode: "RISK_OFF",
      color: "red",
    }

  }

  if (
    dxy?.changePercent < -0.3 &&
    nasdaq?.changePercent > 1
  ) {

    return {
      mode: "RISK_ON",
      color: "green",
    }

  }

  return {
    mode: "NEUTRAL",
    color: "zinc",
  }

}