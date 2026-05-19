// ======================================================
// app/api/news/route.ts
// ======================================================

export const dynamic = "force-dynamic"

import { NextResponse }
  from "next/server"

import { aggregateNews }
  from "@/lib/news/aggregateNews"

import { detectSentiment }
  from "@/lib/news/detectSentiment"

import { rankNews }
  from "@/lib/news/rankNews"

import { translateNews }
  from "@/lib/news/translateNews"

export async function GET(
  req: Request
) {

  try {

    const { searchParams } =
      new URL(req.url)

    const lang =
      (searchParams.get("lang") ||
        "en") as
        "kr" | "en" | "cn"

    const raw =
      await aggregateNews()

    if (!Array.isArray(raw)) {

      return NextResponse.json([])

    }

    const translated =
      await Promise.all(

        raw.map(async (
          item: any,
          idx: number
        ) => {

          const title =
            item.title || ""

          let translatedTitle =
            title

          try {

            translatedTitle =
              await translateNews(
                title,
                lang
              )

          } catch (err) {

            console.error(
              "TRANSLATE ERROR:",
              err
            )

          }

          return {

            id:
              item.id ||
              `${idx}`,

            title,

            translatedTitle,

            url:
              item.url || "#",

            source:
              item.source ||
              "Jinse",

            timestamp:
              item.timestamp ||
              Date.now(),

            sentiment:
              detectSentiment(
                title
              ),

            tags:
              item.tags || [],

          }

        })

      )

    const ranked =
      rankNews(translated)

    return NextResponse.json(
      ranked
    )

  } catch (err) {

    console.error(
      "NEWS API ERROR:",
      err
    )

    return NextResponse.json([])

  }

}