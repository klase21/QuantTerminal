
import { defaultSectors, sectorMap } from "@/lib/sectorMap"

export type SectorAggregate = {
  sector: string
  marketCap: number
  volume: number
  dominance: number
  delta: number
}

export function aggregateSectorData(frames: any[] = []) {
  const sectorState: Record<string, SectorAggregate> = {}

  defaultSectors.forEach((sector) => {
    sectorState[sector] = {
      sector,
      marketCap: 0,
      volume: 0,
      dominance: 0,
      delta: 0,
    }
  })

  frames.forEach((coin: any) => {
    const symbol = String(
      coin.symbol || coin.s || coin.baseAsset || ""
    ).replace("USDT", "")

    const sector = sectorMap[symbol]

    if (!sector) return

    const marketCap =
      Number(coin.marketCap || coin.market_cap || coin.mc || 0)

    const volume =
      Number(coin.volume || coin.quoteVolume || coin.v || 0)

    const delta =
      Number(coin.priceChangePercent || coin.delta || coin.p || 0)

    sectorState[sector].marketCap += marketCap
    sectorState[sector].volume += volume
    sectorState[sector].delta += delta
  })

  const totalMarketCap = Object.values(sectorState).reduce(
    (acc, sector) => acc + sector.marketCap,
    0
  )

  Object.values(sectorState).forEach((sector) => {
    sector.dominance =
      totalMarketCap > 0
        ? (sector.marketCap / totalMarketCap) * 100
        : 0
  })

  return Object.values(sectorState).sort(
    (a, b) => b.dominance - a.dominance
  )
}
