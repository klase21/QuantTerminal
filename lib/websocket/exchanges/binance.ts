import { BaseSocket } from "../core/BaseSocket"
import { TickerData } from "../core/types"

export class BinanceSocket extends BaseSocket {
  private symbols: string[]

  constructor(
    symbols: string[],
    onTicker: (data: TickerData) => void,
  ) {
    super(
      "wss://fstream.binance.com/ws",
      onTicker,
    )

    this.symbols = symbols
  }

  protected onOpen(): void {
    this.send({
      method: "SUBSCRIBE",

      params: this.symbols.map(
        (s) =>
          `${s.toLowerCase()}@ticker`,
      ),

      id: 1,
    })
  }

  protected handleMessage(data: any): void {
    if (!data?.s) return

    const ticker: TickerData = {
      symbol: data.s,

      price: parseFloat(data.c),

      change24h: parseFloat(data.P),

      volume: parseFloat(data.v),

      exchange: "BINANCE",

      timestamp: Date.now(),
    }

    this.onTicker(ticker)
  }

  protected ping(): void {
    // Binance는 클라이언트 ping 필요 없음
    // 브라우저 websocket이면 제거 추천
  }
}