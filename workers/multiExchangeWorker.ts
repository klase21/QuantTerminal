const exchanges = [

  {
    name: "BINANCE",
    url: "wss://stream.binance.com:9443/ws/btcusdt@trade",
  },

  {
    name: "BYBIT",
    url: "wss://stream.bybit.com/v5/public/spot",
  },
]

const sockets: WebSocket[] = []

self.onmessage = () => {

  exchanges.forEach((exchange) => {

    const ws = new WebSocket(exchange.url)

    sockets.push(ws)

    ws.onmessage = (msg) => {

      postMessage({
        exchange: exchange.name,
        data: msg.data,
      })
    }
  })
}