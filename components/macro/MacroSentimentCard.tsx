// ======================================================
// components/macro/MacroSentimentCard.tsx
// ======================================================

interface Props {

  sentiment: any

}

export default function MacroSentimentCard({
  sentiment,
}: Props) {

  const color =

    sentiment.sentiment ===
    "risk_on"

      ? "text-emerald-400"

      : sentiment.sentiment ===
        "risk_off"

      ? "text-red-400"

      : "text-yellow-400"

  return (

    <div
      className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-900
        p-4
      "
    >

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <div
          className="
            text-sm
            text-zinc-400
          "
        >

          Macro Sentiment

        </div>

        <div
          className={`
            text-sm
            font-bold
            uppercase
            ${color}
          `}
        >

          {sentiment.sentiment}

        </div>

      </div>

      <div
        className="
          mt-3
          text-3xl
          font-bold
          text-white
        "
      >

        {sentiment.score}

      </div>

      <div
        className="
          mt-4
          space-y-2
        "
      >

        {sentiment.signals.map(
          (
            signal: string,
            idx: number
          ) => (

            <div
              key={idx}
              className="
                text-xs
                text-zinc-400
              "
            >

              • {signal}

            </div>

          )
        )}

      </div>

    </div>

  )

}