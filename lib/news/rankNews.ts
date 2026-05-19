import { NewsItem }
  from "./types"

const HIGH_IMPACT = [

  "ETF",
  "SEC",
  "Fed",
  "BlackRock",
  "liquidation",
  "hack",
  "listing",
  "delisting",
]

export function rankNews(
  news: NewsItem[]
): NewsItem[] {

  return news.map((item) => {

    let score = 0

    for (const keyword of HIGH_IMPACT) {

      if (
        item.title
          .toLowerCase()
          .includes(
            keyword.toLowerCase()
          )
      ) {

        score += 10
      }
    }

    return {

      ...item,

      importance: score,
    }
  })
}