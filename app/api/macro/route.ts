import {
  MACRO_TICKER_FALLBACK,
  macroSignal,
} from "@/lib/macroTicker"

export const dynamic = "force-dynamic"
export const revalidate = 0

function randomize(
  value: number,
  range: number
) {
  return (
    value +
    (Math.random() * 2 - 1) *
      range
  )
}

function formatPrice(
  value: number
) {
  if (value > 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(0)}B`
  }

  if (value > 1000) {
    return value.toFixed(0)
  }

  return value.toFixed(2)
}

function formatChange(
  value: number
) {
  const sign =
    value >= 0 ? "+" : ""

  return `${sign}${value.toFixed(2)}%`
}

function buildHistory(
  price: number,
  index: number
) {
  return Array.from(
    { length: 36 },
    (_, i) => {
      const wave =
        Math.sin(i * 0.35 + index)

      return price *
        (1 + wave * 0.004)
    }
  )
}

export async function GET() {
  const now = Date.now()

  const items =
    MACRO_TICKER_FALLBACK.map(
      (item, index) => {
        const basePrice =
          Number(item.price || 0)

        const baseChange =
          Number(
            item.changePercent || 0
          )

        const livePrice =
          randomize(
            basePrice,
            Math.max(
              basePrice * 0.002,
              0.01
            )
          )

        const changePercent =
          randomize(
            baseChange,
            0.15
          )

        return {
          ...item,
          value:
            formatPrice(livePrice),
          price:
            livePrice,
          change:
            formatChange(changePercent),
          changePercent,
          signal:
            macroSignal(
              item.symbol,
              changePercent
            ),
          source:
            "tradingview-style-pseudo",
          updatedAt:
            now,
          history:
            buildHistory(
              livePrice,
              index
            ),
        }
      }
    )

  return Response.json({
    items,
    source:
      "tradingview-style-pseudo",
    updatedAt:
      now,
  })
}
