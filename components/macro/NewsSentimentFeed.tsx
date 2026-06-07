"use client"

interface NewsItem {

  id: number

  source: string

  title: string

  sentiment: number

  category: string

  time: string

}

const news: NewsItem[] = [

  {
    id: 1,
    source: "Bloomberg",
    title:
      "Bitcoin ETF inflows accelerate as institutions return",
    sentiment: 0.82,
    category: "ETF",
    time: "2m ago",
  },

  {
    id: 2,
    source: "Reuters",
    title:
      "Fed officials remain cautious on rate cuts",
    sentiment: -0.41,
    category: "FED",
    time: "8m ago",
  },

  {
    id: 3,
    source: "CoinDesk",
    title:
      "Ethereum staking demand rises sharply",
    sentiment: 0.67,
    category: "CRYPTO",
    time: "12m ago",
  },

  {
    id: 4,
    source: "WSJ",
    title:
      "Dollar strength pressures global risk assets",
    sentiment: -0.58,
    category: "MACRO",
    time: "25m ago",
  },

]

export default function NewsSentimentFeed() {

  function getSentimentColor(
    sentiment: number
  ) {

    if (sentiment >= 0.5) {

      return "text-emerald-400"

    }

    if (sentiment >= 0) {

      return "text-emerald-300"

    }

    if (sentiment <= -0.5) {

      return "text-red-400"

    }

    return "text-red-300"

  }

  function getSentimentLabel(
    sentiment: number
  ) {

    if (sentiment >= 0.7) {

      return "VERY BULLISH"

    }

    if (sentiment >= 0.3) {

      return "BULLISH"

    }

    if (sentiment <= -0.7) {

      return "VERY BEARISH"

    }

    if (sentiment <= -0.3) {

      return "BEARISH"

    }

    return "NEUTRAL"

  }

  function getCategoryColor(
    category: string
  ) {

    switch (category) {

      case "ETF":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"

      case "FED":
        return "bg-red-500/20 text-red-400 border-red-500/30"

      case "CRYPTO":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"

      case "MACRO":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"

      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700"

    }

  }

  return (

    <div
      className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950
        overflow-hidden
      "
    >

      {/* HEADER */}

      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >

        <div>

          <div
            className="
              text-sm
              font-semibold
              text-white
            "
          >
            News Sentiment Feed
          </div>

          <div
            className="
              mt-1
              text-xs
              text-zinc-500
            "
          >
            Real-time macro +
            crypto sentiment tracking
          </div>

        </div>

        <div
          className="
            rounded-lg
            border
            border-zinc-700
            bg-zinc-900
            px-3
            py-1
            text-xs
            text-zinc-400
          "
        >
          LIVE
        </div>

      </div>

      {/* FEED */}

      <div
        className="
          divide-y
          divide-zinc-800
        "
      >

        {news.map((item) => (

          <div
            key={item.id}
            className="
              px-4
              py-4
              hover:bg-zinc-900/50
              transition-colors
            "
          >

            {/* TOP */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <div
                  className={`
                    rounded-md
                    border
                    px-2
                    py-1
                    text-[10px]
                    font-semibold

                    ${getCategoryColor(
                      item.category
                    )}
                  `}
                >

                  {item.category}

                </div>

                <div
                  className="
                    text-xs
                    text-zinc-500
                  "
                >

                  {item.source}

                </div>

              </div>

              <div
                className="
                  text-xs
                  text-zinc-500
                "
              >

                {item.time}

              </div>

            </div>

            {/* TITLE */}

            <div
              className="
                mt-3
                text-sm
                leading-relaxed
                text-white
              "
            >

              {item.title}

            </div>

            {/* FOOTER */}

            <div
              className="
                mt-3
                flex
                items-center
                justify-between
              "
            >

              <div
                className={`
                  text-xs
                  font-semibold

                  ${getSentimentColor(
                    item.sentiment
                  )}
                `}
              >

                {getSentimentLabel(
                  item.sentiment
                )}

              </div>

              <div
                className={`
                  text-sm
                  font-bold

                  ${getSentimentColor(
                    item.sentiment
                  )}
                `}
              >

                {item.sentiment > 0
                  ? "+"
                  : ""}

                {(
                  item.sentiment * 100
                ).toFixed(0)}

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

  )

}