"use client"

interface EconomicEvent {
  time: string
  country: string
  event: string
  impact: "HIGH" | "MEDIUM" | "LOW"
  actual?: string
  forecast?: string
  previous?: string
}

const events: EconomicEvent[] = [
  {
    time: "21:30",
    country: "🇺🇸",
    event: "US CPI YoY",
    impact: "HIGH",
    actual: "3.4%",
    forecast: "3.5%",
    previous: "3.5%",
  },
  {
    time: "23:00",
    country: "🇺🇸",
    event: "Fed Chair Speech",
    impact: "HIGH",
  },
  {
    time: "10:00",
    country: "🇨🇳",
    event: "China Industrial Production",
    impact: "MEDIUM",
    actual: "5.1%",
    forecast: "4.9%",
    previous: "4.6%",
  },
]

export default function EconomicCalendar() {

  function getImpactColor(
    impact: string
  ) {

    if (impact === "HIGH") {
      return "bg-red-500/20 text-red-400 border-red-500/30"
    }

    if (impact === "MEDIUM") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700"
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
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >

        <div
          className="
            text-sm
            font-semibold
            text-white
          "
        >
          Economic Calendar
        </div>

        <div
          className="
            mt-1
            text-xs
            text-zinc-500
          "
        >
          High impact macro events
        </div>

      </div>

      {/* EVENTS */}

      <div
        className="
          divide-y
          divide-zinc-800
        "
      >

        {events.map((event, i) => (

          <div
            key={i}
            className="
              grid
              grid-cols-12
              gap-3
              px-4
              py-4
              hover:bg-zinc-900/50
              transition-colors
            "
          >

            {/* TIME */}

            <div
              className="
                col-span-2
                text-sm
                text-zinc-400
              "
            >
              {event.time}
            </div>

            {/* EVENT */}

            <div
              className="
                col-span-5
              "
            >

              <div
                className="
                  text-sm
                  text-white
                "
              >
                {event.country} {event.event}
              </div>

            </div>

            {/* IMPACT */}

            <div
              className="
                col-span-2
              "
            >

              <div
                className={`
                  inline-flex
                  rounded-md
                  border
                  px-2
                  py-1
                  text-xs
                  font-medium
                  ${getImpactColor(event.impact)}
                `}
              >

                {event.impact}

              </div>

            </div>

            {/* DATA */}

            <div
              className="
                col-span-3
                text-right
                text-xs
                text-zinc-500
              "
            >

              {event.actual && (
                <div>
                  A: {event.actual}
                </div>
              )}

              {event.forecast && (
                <div>
                  F: {event.forecast}
                </div>
              )}

            </div>

          </div>

        ))}

      </div>

    </div>

  )

}