export {}

let socket: WebSocket | null = null

interface MarketPacket {
  symbol: string
  price: number
  exchange: string
  latency: number
}

const buffer: Record<string, MarketPacket> = {}

function flushBuffer() {
  postMessage({
    type: "batch",
    payload: Object.values(buffer),
  })

  for (const key in buffer) {
    delete buffer[key]
  }
}

setInterval(flushBuffer, 100)

self.onmessage = (event) => {
  if (event.data.type === "connect") {

    socket = new WebSocket(
      "wss://fstream.binance.com/market/ws/!ticker@arr"
    )

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data)

      data.forEach((coin: any) => {

        const latency =
          Date.now() - coin.E

        buffer[coin.s] = {
          symbol: coin.s,
          price: Number(coin.c),
          exchange: "BINANCE",
          latency,
        }
      })
    }
  }
}