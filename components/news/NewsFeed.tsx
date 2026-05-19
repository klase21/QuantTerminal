// ======================================================
// components/news/NewsFeed.tsx
// ======================================================

"use client"

import {
  useEffect,
  useState,
} from "react"

// ======================================================
// TYPES
// ======================================================

type NewsItem = {

  id: string

  title: string

  translatedTitle?: string

  url?: string

  source: string

  sentiment:
    | "bullish"
    | "bearish"
    | "neutral"

  timestamp: string

}

// ======================================================
// COMPONENT
// ======================================================

export default function NewsFeed() {

  // ======================================================
  // STATE
  // ======================================================

  const [news, setNews] =
    useState<NewsItem[]>([])

  const [lang, setLang] =
    useState<"en" | "kr" | "cn">(
      "en"
    )

  const [loading, setLoading] =
    useState(false)

  // ======================================================
  // FETCH
  // ======================================================

  async function loadNews() {

    try {

      setLoading(true)

      const res =
        await fetch(
          `/api/news?lang=${lang}`,
          {
            cache: "no-store",
          }
        )

      const data =
        await res.json()

      if (Array.isArray(data)) {

        setNews(data)

      }

    } catch (err) {

      console.error(
        "NEWS FETCH ERROR:",
        err
      )

    } finally {

      setLoading(false)

    }

  }

  // ======================================================
  // POLLING
  // ======================================================

  useEffect(() => {

    let mounted = true

    async function fetchLoop() {

      try {

        const res =
          await fetch(
            `/api/news?lang=${lang}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await res.json()

        if (
          mounted &&
          Array.isArray(data)
        ) {

          setNews(data)

        }

      } catch (err) {

        console.error(
          "POLL ERROR:",
          err
        )

      }

    }

    fetchLoop()

    const interval =
      setInterval(
        fetchLoop,
        15000
      )

    return () => {

      mounted = false

      clearInterval(interval)

    }

  }, [lang])

  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        h-full
        flex
        flex-col
      "
    >

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          mb-4
        "
      >

        <div>

          <div
            className="
              text-sm
              font-semibold
            "
          >

            News Feed

          </div>

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Multi-source crypto aggregation

          </div>

        </div>

        {/* ====================================================== */}
        {/* LANGUAGE */}
        {/* ====================================================== */}

        <div
          className="
            flex
            gap-2
          "
        >

          {
            ["en", "kr", "cn"].map(
              (l) => (

                <button

                  key={l}

                  onClick={() =>
                    setLang(
                      l as any
                    )
                  }

                  className={`
                    px-3
                    py-1
                    rounded-lg
                    text-xs
                    border
                    transition-all

                    ${
                      lang === l

                        ? `
                          bg-zinc-800
                          border-zinc-700
                          text-white
                        `

                        : `
                          bg-zinc-950
                          border-zinc-900
                          text-zinc-500
                          hover:text-white
                        `
                    }
                  `}
                >

                  {l.toUpperCase()}

                </button>

              )
            )
          }

        </div>

      </div>

      {/* ====================================================== */}
      {/* LOADING */}
      {/* ====================================================== */}

      {
        loading && news.length === 0 && (

          <div
            className="
              text-sm
              text-zinc-500
            "
          >

            Loading news...

          </div>

        )
      }

      {/* ====================================================== */}
      {/* NEWS LIST */}
      {/* ====================================================== */}

      <div
        className="
          flex-1
          overflow-y-auto
          space-y-3
          pr-1
        "
      >

        {
          news.map((item) => (

            <div

              key={item.id}

              className="
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                p-3
                transition-all
                hover:border-zinc-700
              "
            >

              {/* ====================================================== */}
              {/* TITLE */}
              {/* ====================================================== */}

              <div
                className="
                  text-sm
                  font-medium
                  leading-relaxed
                  text-zinc-100
                "
              >

                {
                  item.translatedTitle ||
                  item.title
                }

              </div>

              {/* ====================================================== */}
              {/* META */}
              {/* ====================================================== */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  mt-3
                "
              >

                {/* SOURCE */}

                <div
                  className="
                    text-[11px]
                    text-zinc-500
                  "
                >

                  {item.source}

                </div>

                {/* SENTIMENT */}

                <div
                  className={`
                    text-[10px]
                    px-2
                    py-1
                    rounded-full
                    font-medium

                    ${
                      item.sentiment ===
                      "bullish"

                        ? `
                          bg-green-500/20
                          text-green-400
                        `

                        : item.sentiment ===
                          "bearish"

                        ? `
                          bg-red-500/20
                          text-red-400
                        `

                        : `
                          bg-zinc-800
                          text-zinc-400
                        `
                    }
                  `}
                >

                  {
                    item.sentiment
                  }

                </div>

              </div>

              {/* ====================================================== */}
              {/* FOOTER */}
              {/* ====================================================== */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  mt-3
                "
              >

                {/* TIME */}

                <div
                  className="
                    text-[10px]
                    text-zinc-600
                  "
                >

                  {
                    new Date(
                      item.timestamp
                    ).toLocaleTimeString()
                  }

                </div>

                {/* LINK */}

                {
                  item.url &&
                  item.url !== "#" && (

                    <a

                      href={item.url}

                      target="_blank"

                      className="
                        text-xs
                        text-blue-400
                        hover:underline
                      "
                    >

                      Open →

                    </a>

                  )
                }

              </div>

            </div>

          ))
        }

      </div>

    </div>

  )

}