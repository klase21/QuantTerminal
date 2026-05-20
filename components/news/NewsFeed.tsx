// ======================================================
// components/news/NewsFeed.tsx
// REGION BASED NEWS INTELLIGENCE FEED
// ======================================================

"use client"

import {
  useEffect,
  useState,
} from "react"

type NewsItem = {
  id: string
  title: string
  translatedTitle?: string
  url?: string
  source: string
  sentiment:
    | "strong_bullish"
    | "bullish"
    | "neutral"
    | "bearish"
    | "strong_bearish"
  timestamp: string | number
  narratives?: string[]
  tags?: string[]
}

const REGIONS = [
  {
    key: "en",
    label: "🇺🇸 EN",
    sub: "Global",
  },
  {
    key: "kr",
    label: "🇰🇷 KR",
    sub: "Korea",
  },
  {
    key: "cn",
    label: "🇨🇳 CN",
    sub: "China",
  },
] as const

const TARGET_LANGS = [
  {
    key: "ko",
    label: "KR",
  },
  {
    key: "en",
    label: "EN",
  },
  {
    key: "zh",
    label: "CN",
  },
] as const

export default function NewsFeed() {
  const [news, setNews] =
    useState<NewsItem[]>([])

  const [region, setRegion] =
    useState<"en" | "kr" | "cn">("en")

  const [translate, setTranslate] =
    useState(true)

  const [targetLang, setTargetLang] =
    useState<"ko" | "en" | "zh">("ko")

  const [loading, setLoading] =
    useState(false)

  async function loadNews() {
    try {
      setLoading(true)

      const res = await fetch(
        `/api/news?region=${region}&translate=${translate}&target=${targetLang}`,
        {
          cache: "no-store",
        }
      )

      const data = await res.json()

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

  useEffect(() => {
    let mounted = true

    async function fetchLoop() {
      try {
        const res = await fetch(
          `/api/news?region=${region}&translate=${translate}&target=${targetLang}`,
          {
            cache: "no-store",
          }
        )

        const data = await res.json()

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
  }, [
    region,
    translate,
    targetLang,
  ])

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
      "
    >
      {/* HEADER */}

      <div
        className="
          mb-4
          flex
          items-start
          justify-between
          gap-4
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
            Narrative Intelligence Feed
          </div>

          <div
            className="
              mt-1
              text-xs
              text-zinc-500
            "
          >
            Region-based crypto narrative tracking
          </div>
        </div>

        <div
          className="
            flex
            flex-col
            items-end
            gap-2
          "
        >
          {/* REGION */}

          <div
            className="
              flex
              gap-2
            "
          >
            {REGIONS.map((r) => (
              <button
                key={r.key}
                onClick={() =>
                  setRegion(r.key)
                }
                className={`
                  rounded-xl
                  border
                  px-3
                  py-2
                  text-xs
                  transition-all

                  ${
                    region === r.key
                      ? `
                        border-cyan-500/30
                        bg-cyan-500/15
                        text-white
                      `
                      : `
                        border-zinc-800
                        bg-zinc-950
                        text-zinc-500
                        hover:text-white
                      `
                  }
                `}
              >
                <div
                  className="
                    font-semibold
                  "
                >
                  {r.label}
                </div>

                <div
                  className="
                    mt-1
                    text-[10px]
                    opacity-70
                  "
                >
                  {r.sub}
                </div>
              </button>
            ))}
          </div>

          {/* TRANSLATE CONTROLS */}

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <button
              onClick={() =>
                setTranslate(
                  !translate
                )
              }
              className={`
                rounded-lg
                border
                px-3
                py-1.5
                text-[11px]
                font-medium
                transition-all

                ${
                  translate
                    ? `
                      border-emerald-500/20
                      bg-emerald-500/15
                      text-emerald-400
                    `
                    : `
                      border-zinc-800
                      bg-zinc-950
                      text-zinc-500
                    `
                }
              `}
            >
              {translate
                ? "Translation ON"
                : "Translation OFF"}
            </button>

            {translate && (
              <div
                className="
                  flex
                  gap-1
                "
              >
                {TARGET_LANGS.map((lang) => (
                  <button
                    key={lang.key}
                    onClick={() =>
                      setTargetLang(lang.key)
                    }
                    className={`
                      rounded-lg
                      border
                      px-2
                      py-1.5
                      text-[10px]
                      font-semibold
                      transition-all

                      ${
                        targetLang === lang.key
                          ? `
                            border-cyan-500/30
                            bg-cyan-500/15
                            text-white
                          `
                          : `
                            border-zinc-800
                            bg-zinc-950
                            text-zinc-500
                            hover:text-white
                          `
                      }
                    `}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOADING */}

      {loading &&
        news.length === 0 && (
          <div
            className="
              flex
              items-center
              justify-center
              rounded-xl
              border
              border-zinc-800
              bg-zinc-950
              py-10
              text-sm
              text-zinc-500
            "
          >
            Loading regional narrative feed...
          </div>
        )}

      {/* EMPTY */}

      {!loading &&
        news.length === 0 && (
          <div
            className="
              flex
              items-center
              justify-center
              rounded-xl
              border
              border-dashed
              border-zinc-800
              py-10
              text-sm
              text-zinc-500
            "
          >
            Waiting for news flow...
          </div>
        )}

      {/* NEWS LIST */}

      <div
        className="
          flex-1
          min-h-0
          overflow-y-auto
          space-y-3
          pr-1
        "
      >
        {news.map((item) => {
          const translated =
            item.translatedTitle &&
            item.translatedTitle !== item.title

          const displayTitle =
            translate && translated
              ? item.translatedTitle
              : item.title

          return (
            <div
              key={item.id}
              className="
                rounded-2xl
                border
                border-zinc-800
                bg-zinc-950/80
                p-4
                transition-all
                hover:border-zinc-700
              "
            >
              {/* TITLE */}

              <div
                className="
                  text-sm
                  font-semibold
                  leading-relaxed
                  text-zinc-100
                "
              >
                {displayTitle}
              </div>

              {/* ORIGINAL */}

              {translate &&
                translated && (
                  <div
                    className="
                      mt-2
                      text-xs
                      leading-relaxed
                      text-zinc-500
                    "
                  >
                    Original: {item.title}
                  </div>
                )}

              {/* TRANSLATION FALLBACK NOTICE */}

              {translate &&
                !translated && (
                  <div
                    className="
                      mt-2
                      text-[11px]
                      text-zinc-600
                    "
                  >
                    Translation unavailable. Showing original.
                  </div>
                )}

              {/* NARRATIVES */}

              {item.narratives &&
                item.narratives.length > 0 && (
                  <div
                    className="
                      mt-3
                      flex
                      flex-wrap
                      gap-1
                    "
                  >
                    {item.narratives.map((narrative) => (
                      <span
                        key={narrative}
                        className="
                          rounded-full
                          border
                          border-cyan-500/20
                          bg-cyan-500/10
                          px-2
                          py-1
                          text-[10px]
                          font-bold
                          text-cyan-300
                        "
                      >
                        {narrative}
                      </span>
                    ))}
                  </div>
                )}

              {/* META */}

              <div
                className="
                  mt-4
                  flex
                  items-center
                  justify-between
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
                    className="
                      rounded-lg
                      border
                      border-zinc-800
                      bg-zinc-900/80
                      px-2
                      py-1
                      text-[10px]
                      font-semibold
                      text-zinc-400
                    "
                  >
                    {item.source}
                  </div>

                  <div
                    className="
                      text-[10px]
                      text-zinc-600
                    "
                  >
                    {new Date(
                      item.timestamp
                    ).toLocaleTimeString()}
                  </div>
                </div>

                <div
                  className={`
                    rounded-full
                    px-2
                    py-1
                    text-[10px]
                    font-semibold

                    ${
                      item.sentiment ===
                      "bullish"
                        ? `
                          bg-emerald-500/15
                          text-emerald-400
                        `
                        : item.sentiment ===
                          "bearish"
                        ? `
                          bg-red-500/15
                          text-red-400
                        `
                        : `
                          bg-zinc-800
                          text-zinc-400
                        `
                    }
                  `}
                >
                  {item.sentiment}
                </div>
              </div>

              {/* LINK */}

              {item.url &&
                item.url !== "#" && (
                  <div
                    className="
                      mt-4
                    "
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        text-xs
                        font-medium
                        text-cyan-400
                        hover:underline
                      "
                    >
                      Open Source →
                    </a>
                  </div>
                )}
            </div>
          )
        })}
      </div>
    </div>
  )
}