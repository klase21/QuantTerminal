import { BinanceSocket } from "../exchanges/binance"
import { useMarketStore } from "@/lib/stores/marketStore"

class SocketManager {
  private sockets: any[] = []

  start() {
    const updateTicker = useMarketStore.getState().updateTicker

    const binance = new BinanceSocket(
      ["btcusdt", "ethusdt", "solusdt"],
      updateTicker,
    )

    binance.connect()

    this.sockets.push(binance)
  }

  stop() {
    this.sockets.forEach((socket) => {
      socket.disconnect()
    })

    this.sockets = []
  }
}

export const socketManager = new SocketManager()