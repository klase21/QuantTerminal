import { NextResponse } from "next/server"

import { getMergedNews } from "@/services/news/mergeNews"

export async function GET() {
  try {
    const news = await getMergedNews()

    return NextResponse.json(news)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch news",
      },
      {
        status: 500,
      }
    )
  }
}