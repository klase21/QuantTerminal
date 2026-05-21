import {
  MACRO_TICKER_FALLBACK,
  MacroTickerItem,
  macroSignal,
} from "@/lib/macroTicker"

export const dynamic = "force-dynamic"
export const revalidate = 0

type YahooQuote = {
  symbol: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
}

const YAHOO_SYMBOLS: Record<
  string,
  {
    query: string
    label: string
    decimals: number
  }
> = {
  DXY: {
    query: "DX-Y.NYB",
    label: "DXY",
    decimals: 2,
  },
  US10Y: {
    query: "^TNX",
    label: "US10Y",
    decimals: 2,
  },
  NASDAQ: {
    query: "^IXIC",
    label: "NASDAQ",
    decimals: 0,
  },
  SPX: {
    query: "^GSPC",
    label: "S&P500",
    decimals: 0,
  },
  VIX: {
    query: "^VIX",
    label: "VIX",
    decimals: 2,
  },
  GOLD: {
    query: "GC=F",
    label: "GOLD",
    decimals: 0,
  },
  OIL: {
    query: "CL=F",
    label: "OIL",
    decimals: 2,
  },
  US2Y: {
    query: "ZT=F",
    label: "US2Y",
    decimals: 2,
  },
  MOVE: {
    query: "^MOVE",
    label: "MOVE",
    decimals: 2,
  },
  BTC: {
    query: "BTC-USD",
    label: "BTC",
    decimals: 0,
  },
  ETH: {
    query: "ETH-USD",
    label: "ETH",
    decimals: 0,
  },
}

function formatValue(
  value: number,
  decimals: number
) {
  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: decimals,
      minimumFractionDigits:
        decimals > 0 ? decimals : 0,
    }
  )
}

function formatChange(
  value: number
) {
  const sign =
    value >= 0 ? "+" : ""

  return `${sign}${value.toFixed(2)}%`
}

async function fetchYahooItems() {
  const symbols =
    Object.values(YAHOO_SYMBOLS)
      .map((item) => item.query)
      .join(",")

  const res =
    await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 QuantTerminal/1.0",
        },
      }
    )

  if (!res.ok) {
    console.warn(
      `Yahoo macro feed unavailable (${res.status}), using fallback`
    )

    return []
  }

  const json =
    await res.json()

  const quotes =
    json?.quoteResponse?.result || []

  const quoteMap =
    new Map<string, YahooQuote>()

  quotes.forEach((quote: YahooQuote) => {
    quoteMap.set(
      quote.symbol,
      quote
    )
  })

  const items: MacroTickerItem[] = []

  Object.entries(YAHOO_SYMBOLS).forEach(
    ([symbol, meta]) => {
      const quote =
        quoteMap.get(meta.query)

      const price =
        Number(
          quote?.regularMarketPrice
        )

      const change =
        Number(
          quote?.regularMarketChangePercent
        )

      if (
        !Number.isFinite(price) ||
        !Number.isFinite(change)
      ) {
        return
      }

      items.push({
        symbol: meta.query,
        label: meta.label,
        value: formatValue(
          price,
          meta.decimals
        ),
        change: formatChange(change),
        price,
        changePercent: change,
        signal: macroSignal(
          symbol,
          change
        ),
        hidden:
          symbol === "BTC" ||
          symbol === "ETH",
        source: "yahoo",
        updatedAt: Date.now(),
      })
    }
  )

  return items
}

async function fetchTotal3() {
  try {
    const res =
      await fetch(
        "https://api.coingecko.com/api/v3/global",
        {
          cache: "no-store",
          headers: {
            "User-Agent":
              "Mozilla/5.0 QuantTerminal/1.0",
          },
        }
      )

    if (!res.ok) {
      console.warn(
        `CoinGecko unavailable (${res.status}), using fallback`
      )

      return null
    }

    const json =
      await res.json()

    const totalMarketCap =
      Number(
        json?.data?.total_market_cap?.usd || 0
      )

    const btcPct =
      Number(
        json?.data?.market_cap_percentage?.btc || 0
      )

    const ethPct =
      Number(
        json?.data?.market_cap_percentage?.eth || 0
      )

    if (!totalMarketCap) return null

    const total3 =
      totalMarketCap *
      (1 - (btcPct + ethPct) / 100)

    return {
      symbol: "TOTAL3",
      label: "TOTAL3",
      value: `${(total3 / 1_000_000_000).toFixed(0)}B`,
      change: "+0.00%",
      price: total3,
      changePercent: 0,
      signal: "Alt Liquidity",
      source: "coingecko",
      updatedAt: Date.now(),
    } satisfies MacroTickerItem
  } catch (err) {
    console.error(
      "TOTAL3 FETCH ERROR:",
      err
    )

    return null
  }
}


function mergeWithFallback(
  liveItems: MacroTickerItem[]
) {
  const liveByLabel =
    new Map(
      liveItems.map((item) => [
        item.label,
        item,
      ])
    )

  return MACRO_TICKER_FALLBACK.map(
    (fallback) =>
      liveByLabel.get(fallback.label) || fallback
  )
}

export async function GET() {
  try {
    const yahooItems =
      await fetchYahooItems()
        .catch((err) => {
          console.warn(
            "MACRO LIVE FEED UNAVAILABLE:",
            err instanceof Error
              ? err.message
              : err
          )

          return []
        })

    const total3 =
      await fetchTotal3()
        .catch((err) => {
          console.warn(
            "TOTAL3 FEED UNAVAILABLE:",
            err instanceof Error
              ? err.message
              : err
          )

          return null
        })

    const liveItems =
      total3
        ? [
            ...yahooItems,
            total3,
          ]
        : yahooItems

    const items =
      mergeWithFallback(liveItems)

    return Response.json({
      items,
      source:
        liveItems.length > 0
          ? "live+fallback"
          : "fallback",
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.warn(
      "MACRO API FALLBACK:",
      err instanceof Error
        ? err.message
        : err
    )

    return Response.json({
      items: MACRO_TICKER_FALLBACK,
      source: "fallback",
      error:
        err instanceof Error
          ? err.message
          : "unknown",
    })
  }
}
