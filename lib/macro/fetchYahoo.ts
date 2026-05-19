// ======================================================
// lib/macro/fetchYahoo.ts
// ======================================================

export async function fetchYahooChart(
  symbol: string
) {

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`

  const res =
    await fetch(url, {

      headers: {
        "User-Agent":
          "Mozilla/5.0",
      },

      cache: "no-store",
    })

  const json =
    await res.json()

  const result =
    json.chart.result?.[0]

  if (!result) {

    return null

  }

  const meta =
    result.meta

  const closes =
    result.indicators
      ?.quote?.[0]
      ?.close || []

  const last =
    closes
      .filter(Boolean)
      .at(-1)

  const prevClose =
    meta.previousClose

  const change =
    last - prevClose

  const changePercent =
    (change / prevClose) * 100

  return {

    price: last,

    prevClose,

    change,

    changePercent,

    currency:
      meta.currency,

    marketState:
      meta.marketState,

  }

}