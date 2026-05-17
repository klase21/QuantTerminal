"use client"

import { useEffect } from "react"

import useMarketStore from "@/store/useMarketStore"

export default function useMarketWorker() {

  const updateBatch =
    useMarketStore(
      (state) => state.updateBatch
    )

  useEffect(() => {

    const worker = new Worker(
      new URL(
        "../workers/marketWorker.ts",
        import.meta.url
      )
    )

    worker.postMessage({
      type: "connect",
    })

    worker.onmessage = (event) => {

      if (event.data.type === "batch") {

        updateBatch(event.data.payload)
      }
    }

    return () => {
      worker.terminate()
    }

  }, [updateBatch])
}