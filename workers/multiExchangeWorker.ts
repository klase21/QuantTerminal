const exchanges = [

  {
    name: "BINANCE",
    url: "wss://fstream.binance.com/market/ws/btcusdt@trade",
  },

  {
    name: "BYBIT",
    url: "wss://stream.bybit.com/v5/public/spot",
  },

]

const sockets: WebSocket[] = []

self.onmessage = () => {

  // 기존 소켓 종료
  sockets.forEach((socket) => {
    socket.close()
  })

  sockets.length = 0

  exchanges.forEach((exchange) => {

    const ws = new WebSocket(
      exchange.url
    )

    sockets.push(ws)

    // =========================================
    // OPEN
    // =========================================

    ws.onopen = () => {

      // BYBIT subscribe 필요
      if (exchange.name === "BYBIT") {

        ws.send(
          JSON.stringify({

            op: "subscribe",

            args: [
              "publicTrade.BTCUSDT",
            ],

          })
        )

      }

    }

    // =========================================
    // MESSAGE
    // =========================================

    ws.onmessage = (msg) => {

      self.postMessage({

        exchange:
          exchange.name,

        data:
          JSON.parse(
            msg.data
          ),

      })

    }

    // =========================================
    // ERROR
    // =========================================

    ws.onerror = (err) => {

      self.postMessage({

        type: "error",

        exchange:
          exchange.name,

        error: err,

      })

    }

    // =========================================
    // CLOSE
    // =========================================

    ws.onclose = () => {

      self.postMessage({

        type: "closed",

        exchange:
          exchange.name,

      })

    }

  })

}