let socket: WebSocket | null = null

self.onmessage = (event) => {

  if (event.data.type === "connect") {

    socket = new WebSocket(
      "wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms"
    )

    socket.onmessage = (msg) => {

      const data = JSON.parse(msg.data)

      postMessage({
        type: "depth",
        bids: data.b,
        asks: data.a,
      })
    }
  }
}