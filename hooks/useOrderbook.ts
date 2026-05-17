"use client"

import { useEffect, useState } from "react"

export default function useOrderbook() {

  const [bids, setBids] = useState<any[]>([])
  const [asks, setAsks] = useState<any[]>([])

  useEffect(() => {

    const worker = new Worker(
      new URL(
        "../workers/orderbookWorker.ts",
        import.meta.url
      )
    )

    worker.postMessage({
      type: "connect",
    })

    worker.onmessage = (event) => {

      if (event.data.type === "depth") {

        setBids(event.data.bids)
        setAsks(event.data.asks)
      }
    }

    return () => {
      worker.terminate()
    }

  }, [])

  return {
    bids,
    asks,
  }
}