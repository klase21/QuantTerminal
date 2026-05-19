import { fetchCoinDeskNews } from "./fetchCoinDesk"
import { fetchCoinnessNews } from "./fetchCoinness"
import { fetchJinseNews } from "./fetchJinse"

export async function getMergedNews() {
  const [
    coindesk,
    coinness,
    jinse,
  ] = await Promise.all([
    fetchCoinDeskNews(),
    fetchCoinnessNews(),
    fetchJinseNews(),
  ])

  return [
    ...coindesk,
    ...coinness,
    ...jinse,
  ].sort(
    (a, b) =>
      b.publishedAt - a.publishedAt
  )
}