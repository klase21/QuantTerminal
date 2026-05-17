import { useEffect } from "react"

import { socketManager } from "../core/SocketManager"

export function useTickerSocket() {
  useEffect(() => {
    socketManager.start()

    return () => {
      socketManager.stop()
    }
  }, [])
}