// ======================================================
// hooks/useWorkerSocket.ts
// ======================================================

"use client"

import { useEffect } from "react"

export default function useWorkerSocket() {

  useEffect(() => {

    const worker =
      new Worker("/ws-worker.js")

    worker.postMessage({
      type: "CONNECT",
      url:
        "wss://stream.binance.com:9443/ws/btcusdt@trade",
    })

    worker.onmessage = (event) => {
      console.log(event.data)
    }

    return () => worker.terminate()

  }, [])
}