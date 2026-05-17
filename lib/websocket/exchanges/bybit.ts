import { BaseSocket } from "../core/BaseSocket"
import { TickerData } from "../core/types"

export class BybitSocket extends BaseSocket {

  private symbols: string[]

  constructor(
    symbols: string[],
    onTicker: (
      data: TickerData
    ) => void
  ) {

    super(
      "wss://stream.bybit.com/v5/public/linear",
      onTicker
    )

    this.symbols = symbols
  }

  protected onOpen(): void {

    this.send({
      op: "subscribe",
      args: this.symbols.map(
        (s) =>
          `tickers.${s}`
      ),
    })
  }

  protected handleMessage(
    data: any
  ): void {

    if (
      !data?.topic ||
      !data?.data
    ) {
      return
    }

    const ticker = data.data

    const parsed: TickerData = {

      symbol: ticker.symbol,

      price: parseFloat(
        ticker.lastPrice
      ),

      change24h: parseFloat(
        ticker.price24hPcnt
      ) * 100,

      volume: parseFloat(
        ticker.volume24h
      ),

      exchange: "BYBIT",

      timestamp: Date.now(),
    }

    this.onTicker(parsed)
  }

  protected ping(): void {

    this.send({
      op: "ping",
    })
  }
}