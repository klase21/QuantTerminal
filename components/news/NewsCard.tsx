import { NewsItem } from "@/lib/news/types"

import SentimentBadge from "./SentimentBadge"

interface Props {
  item: NewsItem
}

export default function NewsCard({
  item,
}: Props) {

  return (

    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="
        block
        rounded-lg
        border
        border-zinc-800
        bg-zinc-900
        p-3
        transition
        hover:border-zinc-700
      "
    >

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div
        className="
          mb-2
          flex
          items-center
          justify-between
        "
      >

        <div
          className="
            text-xs
            text-zinc-400
          "
        >

          {item.source}

        </div>

        <SentimentBadge
          sentiment={
            item.sentiment
          }
        />

      </div>

      {/* ====================================================== */}
      {/* TITLE */}
      {/* ====================================================== */}

      <div
        className="
          mb-3
          text-sm
          font-medium
          leading-relaxed
          text-white
        "
      >

        {
          item.translatedTitle ||
          item.title
        }

      </div>

      {/* ====================================================== */}
      {/* TAGS */}
      {/* ====================================================== */}

      {
        item.tags &&
        item.tags.length > 0 && (

          <div
            className="
              flex
              flex-wrap
              gap-1
            "
          >

            {
              item.tags.map(
                (tag) => (

                  <div
                    key={tag}
                    className="
                      rounded
                      bg-zinc-800
                      px-2
                      py-1
                      text-[10px]
                      text-zinc-300
                    "
                  >

                    #{tag}

                  </div>

                )
              )
            }

          </div>

        )
      }

    </a>

  )

}