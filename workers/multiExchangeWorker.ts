const exchanges = [
  {
    name: "BINANCE_FUTURES",

    // ======================================================
    // BINANCE FUTURES TRADE STREAM
    // ======================================================

    url:
      "wss://fstream.binance.com/ws/btcusdt@trade",
  },

  {
    name: "BYBIT_FUTURES",

    // ======================================================
    // BYBIT LINEAR USDT PERP
    // ======================================================

    url:
      "wss://stream.bybit.com/v5/public/linear",
  },
]

const sockets: WebSocket[] = []

self.onmessage = () => {

  exchanges.forEach((exchange) => {

    const ws =
      new WebSocket(exchange.url)

    sockets.push(ws)

    // ======================================================
    // BYBIT SUBSCRIBE
    // ======================================================

    ws.onopen = () => {

      if (
        exchange.name ===
        "BYBIT_FUTURES"
      ) {

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

    // ======================================================
    // MESSAGE
    // ======================================================

    ws.onmessage = (msg) => {

      try {

        const parsed =
          JSON.parse(msg.data)

        postMessage({

          exchange:
            exchange.name,

          data: parsed,

        })

      } catch (err) {

        console.error(
          "WS Parse Error",
          err
        )

      }

    }

    // ======================================================
    // ERROR
    // ======================================================

    ws.onerror = (err) => {

      console.error(
        `${exchange.name} WS Error`,
        err
      )

    }

    // ======================================================
    // CLOSE
    // ======================================================

    ws.onclose = () => {

      console.warn(
        `${exchange.name} WS Closed`
      )

    }

  })

}

// ======================================================
// CLEANUP
// ======================================================

self.onclose = () => {

  sockets.forEach((ws) => {

    ws.close()

  })

}