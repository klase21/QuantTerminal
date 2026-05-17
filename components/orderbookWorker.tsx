export {}

let socket: WebSocket | null = null

self.onmessage = (event) => {

  const { symbol } = event.data

  if (socket) {
    socket.close()
  }

  socket = new WebSocket(
    `wss://fstream.binance.com/public/ws/${symbol}@depth20@100ms`
  )

  socket.onmessage = (msg) => {

    self.postMessage(
      JSON.parse(msg.data)
    )

  }

}