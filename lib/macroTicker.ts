export type MacroTickerItem = {
  symbol: string
  label: string
  value: string
  change: string
  signal: string
  price?: number
  changePercent?: number
  source?: string
  updatedAt?: number
  hidden?: boolean
  history?: number[]
}

export const MACRO_TICKER_FALLBACK: MacroTickerItem[] = [
  {
    symbol: "DX-Y.NYB",
    label: "DXY",
    value: "99.44",
    change: "+0.12%",
    price: 99.44,
    changePercent: 0.12,
    signal: "Dollar Pressure",
    source: "fallback",
  },
  {
    symbol: "^TNX",
    label: "US10Y",
    value: "4.65",
    change: "-0.30%",
    price: 4.65,
    changePercent: -0.30,
    signal: "Yields Easing",
    source: "fallback",
  },
  {
    symbol: "^IXIC",
    label: "NASDAQ",
    value: "26028",
    change: "+0.81%",
    price: 26028,
    changePercent: 0.81,
    signal: "Risk-On",
    source: "fallback",
  },
  {
    symbol: "^GSPC",
    label: "SPX",
    value: "6624",
    change: "+0.48%",
    price: 6624,
    changePercent: 0.48,
    signal: "Equity Beta",
    source: "fallback",
  },
  {
    symbol: "^VIX",
    label: "VIX",
    value: "14.80",
    change: "-2.15%",
    price: 14.8,
    changePercent: -2.15,
    signal: "Vol Compression",
    source: "fallback",
  },
  {
    symbol: "GC=F",
    label: "GOLD",
    value: "2408",
    change: "+0.22%",
    price: 2408,
    changePercent: 0.22,
    signal: "Safe Haven",
    source: "fallback",
  },
  {
    symbol: "CL=F",
    label: "OIL",
    value: "78.42",
    change: "-0.64%",
    price: 78.42,
    changePercent: -0.64,
    signal: "Energy Pressure",
    source: "fallback",
  },
  {
    symbol: "ZT=F",
    label: "US2Y",
    value: "4.28",
    change: "-0.21%",
    price: 4.28,
    changePercent: -0.21,
    signal: "Fed Path",
    source: "fallback",
  },
  {
    symbol: "^MOVE",
    label: "MOVE",
    value: "96.30",
    change: "-1.04%",
    price: 96.3,
    changePercent: -1.04,
    signal: "Bond Vol",
    source: "fallback",
  },
  {
    symbol: "TOTAL3",
    label: "TOTAL3",
    value: "692B",
    change: "+1.31%",
    price: 692_000_000_000,
    changePercent: 1.31,
    signal: "Alt Liquidity",
    source: "fallback",
  },
  {
    symbol: "BTC-USD",
    label: "BTC",
    value: "77165",
    change: "+0.53%",
    price: 77165,
    changePercent: 0.53,
    signal: "Crypto Beta",
    source: "fallback",
    hidden: true,
  },
  {
    symbol: "ETH-USD",
    label: "ETH",
    value: "2127",
    change: "+0.81%",
    price: 2127,
    changePercent: 0.81,
    signal: "Crypto Beta",
    source: "fallback",
    hidden: true,
  },
]

export function macroSignal(
  symbol: string,
  changePercent: number
) {
  if (symbol === "DXY") {
    return changePercent > 0
      ? "Dollar Pressure"
      : "Dollar Relief"
  }

  if (
    symbol === "US10Y" ||
    symbol === "US2Y"
  ) {
    return changePercent > 0
      ? "Yield Pressure"
      : "Yields Easing"
  }

  if (
    symbol === "NASDAQ" ||
    symbol === "SPX"
  ) {
    return changePercent >= 0
      ? "Risk-On"
      : "Risk-Off"
  }

  if (symbol === "VIX") {
    return changePercent > 0
      ? "Vol Expansion"
      : "Vol Compression"
  }

  if (symbol === "MOVE") {
    return changePercent > 0
      ? "Bond Vol Risk"
      : "Bond Vol Easing"
  }

  if (symbol === "TOTAL3") {
    return changePercent >= 0
      ? "Alt Liquidity"
      : "Alt Pressure"
  }

  if (symbol === "GOLD") {
    return changePercent >= 0
      ? "Safe Haven Bid"
      : "Safe Haven Fade"
  }

  if (symbol === "OIL") {
    return changePercent >= 0
      ? "Energy Bid"
      : "Energy Pressure"
  }

  return changePercent >= 0
    ? "Positive"
    : "Negative"
}
