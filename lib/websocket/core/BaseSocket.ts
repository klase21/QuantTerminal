import { TickerData } from "./types"

export abstract class BaseSocket {

  protected ws: WebSocket | null = null

  protected connected = false

  protected reconnectTimer:
    ReturnType<typeof setTimeout> | null = null

  protected heartbeatTimer:
    ReturnType<typeof setInterval> | null = null

  constructor(
    protected url: string,
    protected onTicker: (
      data: TickerData
    ) => void
  ) {}

  connect() {

    if (this.ws) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {

      console.log(`[WS OPEN] ${this.url}`)

      this.connected = true

      this.onOpen()

      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {

      try {

        const data =
          JSON.parse(event.data)

        this.handleMessage(data)

      } catch (err) {

        console.error(
          "WS parse error",
          err
        )
      }
    }

    this.ws.onerror = (err) => {

      console.error(
        "WS error",
        err
      )
    }

    this.ws.onclose = () => {

      console.log(
        `[WS CLOSED] ${this.url}`
      )

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

    if (this.reconnectTimer)
      return

    this.reconnectTimer =
      setTimeout(() => {

        console.log(
          `[WS RECONNECT] ${this.url}`
        )

        this.ws = null

        this.reconnectTimer = null

        this.connect()

      }, 3000)
  }

  protected startHeartbeat() {

    this.heartbeatTimer =
      setInterval(() => {

        if (
          !this.ws ||
          this.ws.readyState !==
            WebSocket.OPEN
        ) {
          return
        }

        this.ping()

      }, 20000)
  }

  protected cleanup() {

    if (this.heartbeatTimer) {

      clearInterval(
        this.heartbeatTimer
      )

      this.heartbeatTimer = null
    }

    if (this.reconnectTimer) {

      clearTimeout(
        this.reconnectTimer
      )

      this.reconnectTimer = null
    }
  }

  protected send(data: any) {

    if (
      !this.ws ||
      this.ws.readyState !==
        WebSocket.OPEN
    ) {
      return
    }

    this.ws.send(
      JSON.stringify(data)
    )
  }

  protected ping() {}

  protected abstract onOpen():
    void

  protected abstract handleMessage(
    data: any
  ): void
}