import { useMarketStore } from "@/store/useMarketStore"

export function startMockFeed() {
  setInterval(() => {
    const current = useMarketStore.getState().market

    const btcMove = (Math.random() - 0.5) * 400
    const ethMove = (Math.random() - 0.5) * 30

    useMarketStore.getState().updateMarket({
      btcPrice: Number((current.btcPrice + btcMove).toFixed(0)),
      ethPrice: Number((current.ethPrice + ethMove).toFixed(0)),
      fundingRate: Number((Math.random() * 0.05).toFixed(3)),
      openInterest: Number((10 + Math.random() * 5).toFixed(2)),
      longShortRatio: Number((0.8 + Math.random() * 0.8).toFixed(2)),
      sentimentScore: Math.floor(40 + Math.random() * 60),
    })
  }, 2000)
}