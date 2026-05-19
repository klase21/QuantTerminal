// ======================================================
// components/macro/MacroCard.tsx
// ======================================================

interface Props {

  item: any

}

export default function MacroCard({
  item,
}: Props) {

  const positive =
    item.changePercent >= 0

  return (

    <div
      className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-900
        p-3
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
            font-medium
            text-white
          "
        >

          {item.label}

        </div>

        <div
          className={`
            text-sm
            font-semibold

            ${
              positive

                ? "text-emerald-400"

                : "text-red-400"
            }
          `}
        >

          {positive ? "+" : ""}

          {item.changePercent?.toFixed(2)}%

        </div>

      </div>

      <div
        className="
          mt-2
          text-xs
          text-zinc-500
        "
      >

        {item.price?.toLocaleString()}

      </div>

    </div>

  )

}