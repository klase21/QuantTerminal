// ======================================================
// app/api/macro/route.ts
// ======================================================

import { NextResponse }
  from "next/server"

import { fetchYahooChart }
  from "@/lib/macro/fetchYahoo"

import { MACRO_SYMBOLS }
  from "@/lib/macro/macroSymbols"

export const dynamic =
  "force-dynamic"

export async function GET() {

  try {

    const data =
      await Promise.all(

        MACRO_SYMBOLS.map(
          async (item) => {

            const result =
              await fetchYahooChart(
                item.symbol
              )

            return {

              ...item,

              ...result,

            }

          }
        )
      )

    return NextResponse.json(
      data
    )

  } catch (err) {

    console.error(
      "MACRO API ERROR:",
      err
    )

    return NextResponse.json([])

  }

}