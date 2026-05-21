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
    symbol: "TVC:DXY",
    label: "DXY",
    value: "99.44",
    change: "+0.12%",
    price: 99.44,
    changePercent: 0.12,
    signal: "Dollar Pressure",
  },
  {
    symbol: "TVC:US10Y",
    label: "US10Y",
    value: "4.65",
    change: "-0.30%",
    price: 4.65,
    changePercent: -0.30,
    signal: "Yields Easing",
  },
  {
    symbol: "NASDAQ:NDX",
    label: "NASDAQ",
    value: "26028",
    change: "+0.81%",
    price: 26028,
    changePercent: 0.81,
    signal: "Risk-On",
  },
  {
    symbol: "SP:SPX",
    label: "SPX",
    value: "6624",
    change: "+0.48%",
    price: 6624,
    changePercent: 0.48,
    signal: "Equity Beta",
  },
  {
    symbol: "CBOE:VIX",
    label: "VIX",
    value: "14.80",
    change: "-2.15%",
    price: 14.8,
    changePercent: -2.15,
    signal: "Vol Compression",
  },
  {
    symbol: "COMEX:GC1!",
    label: "GOLD",
    value: "2408",
    change: "+0.22%",
    price: 2408,
    changePercent: 0.22,
    signal: "Safe Haven",
  },
  {
    symbol: "NYMEX:CL1!",
    label: "OIL",
    value: "78.42",
    change: "-0.64%",
    price: 78.42,
    changePercent: -0.64,
    signal: "Energy Pressure",
  },
  {
    symbol: "CRYPTOCAP:TOTAL3",
    label: "TOTAL3",
    value: "692B",
    change: "+1.31%",
    price: 692_000_000_000,
    changePercent: 1.31,
    signal: "Alt Liquidity",
  },
  {
    symbol: "BINANCE:BTCUSDT",
    label: "BTC",
    value: "77165",
    change: "+0.53%",
    price: 77165,
    changePercent: 0.53,
    signal: "Crypto Beta",
    hidden: true,
  },
  {
    symbol: "BINANCE:ETHUSDT",
    label: "ETH",
    value: "2127",
    change: "+0.81%",
    price: 2127,
    changePercent: 0.81,
    signal: "Crypto Beta",
    hidden: true,
  },
]

export function macroSignal(
  symbol: string,
  changePercent: number
) {
  if (symbol.includes("DXY")) {
    return changePercent > 0
      ? "Dollar Pressure"
      : "Dollar Relief"
  }

  if (symbol.includes("US10Y")) {
    return changePercent > 0
      ? "Yield Pressure"
      : "Yields Easing"
  }

  if (
    symbol.includes("NASDAQ") ||
    symbol.includes("NDX") ||
    symbol.includes("SPX")
  ) {
    return changePercent >= 0
      ? "Risk-On"
      : "Risk-Off"
  }

  if (symbol.includes("VIX")) {
    return changePercent > 0
      ? "Vol Expansion"
      : "Vol Compression"
  }

  if (symbol.includes("TOTAL3")) {
    return changePercent >= 0
      ? "Alt Liquidity"
      : "Alt Pressure"
  }

  return changePercent >= 0
    ? "Positive"
    : "Negative"
}
