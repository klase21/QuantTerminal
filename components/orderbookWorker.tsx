// ======================================================
// orderbookWorker.ts
// ======================================================

let socket: WebSocket | null = null

self.onmessage = (event) => {

  const symbol =
    event.data.symbol || "btcusdt"

  // 기존 소켓 종료
  if (socket) {
    socket.close()
  }

  socket = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth20@100ms`
  )

  socket.onmessage = (msg) => {

    const data = JSON.parse(msg.data)

    const bids =
      (data.b || []).map(
        ([price, qty]: string[]) => ({
          price: Number(price),
          qty: Number(qty),
        })
      )

    const asks =
      (data.a || []).map(
        ([price, qty]: string[]) => ({
          price: Number(price),
          qty: Number(qty),
        })
      )

    self.postMessage({
      bids,
      asks,
    })

  }

}

export {}