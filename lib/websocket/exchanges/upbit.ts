import { BaseSocket } from "../core/BaseSocket"
import { TickerData } from "../core/types"

export class UpbitSocket extends BaseSocket {

  private symbols: string[]

  constructor(
    symbols: string[],
    onTicker: (
      data: TickerData
    ) => void
  ) {

    super(
      "wss://api.upbit.com/websocket/v1",
      onTicker
    )

    this.symbols = symbols
  }

  protected onOpen(): void {

    this.send([
      {
        ticket: "QuantTerminal",
      },

      {
        type: "ticker",

        codes: this.symbols,
      },
    ])
  }

  protected handleMessage(
    data: any
  ): void {

    const parsed: TickerData = {

      symbol: data.code,

      price:
        Number(data.trade_price),

      change24h:
        Number(
          data.signed_change_rate
        ) * 100,

      volume:
        Number(
          data.acc_trade_volume_24h
        ),

      exchange: "UPBIT",

      timestamp: Date.now(),
    }

    this.onTicker(parsed)
  }

  protected ping(): void {

    if (
      this.ws &&
      this.ws.readyState ===
        WebSocket.OPEN
    ) {

      this.ws.send("PING")
    }
  }
}