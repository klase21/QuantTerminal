import { TickerData } from "./types"
    this.ws.onerror = (err) => {
      console.error("WS error", err)
    }

    this.ws.onclose = () => {
      console.log(`[WS CLOSED] ${this.url}`)

      this.connected = false
      this.cleanup()
      this.reconnect()
    }
  }

  disconnect() {
    this.cleanup()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  protected reconnect() {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      console.log(`[WS RECONNECT] ${this.url}`)

      this.ws = null
      this.reconnectTimer = null

      this.connect()
    }, 3000)
  }

  protected startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return
      }

      this.ping()
    }, 20000)
  }

  protected cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  protected send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.ws.send(JSON.stringify(data))
  }

  protected ping() {}

  protected abstract onOpen(): void

  protected abstract handleMessage(data: any): void
}