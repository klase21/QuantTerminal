"use client"

import { useEffect, useRef, useState } from "react"

type TradeSide = "buy" | "sell"

interface FlowTrade {
  price: number
  qty: number
  side: TradeSide
  time: number
  value: number
  symbol: string
}

interface TradeFlowState {
  symbol: string
  buyVolume: number
  sellVolume: number
  buyPressure: number
  sellPressure: number
  delta: number
  cvd: number
  trades: FlowTrade[]
}

function normalizeSymbol(symbol: string) {
  return (symbol || "BTCUSDT").replace("/", "").toUpperCase()
}

function emptyFlow(symbol: string): TradeFlowState {
  return {
    symbol,
    buyVolume: 0,
    sellVolume: 0,
    buyPressure: 0,
    sellPressure: 0,
    delta: 0,
    cvd: 0,
    trades: [],
  }
}

export default function useTradeFlowSocket(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)

  const [flow, setFlow] = useState<TradeFlowState>(() =>
    emptyFlow(normalizedSymbol),
  )

  const cvdRef = useRef(0)
  const buyRef = useRef(0)
  const sellRef = useRef(0)
  const tradesRef = useRef<FlowTrade[]>([])
  const activeSymbolRef = useRef(normalizedSymbol)
  const socketSeqRef = useRef(0)

  useEffect(() => {
    const currentSymbol = normalizeSymbol(symbol)

    activeSymbolRef.current = currentSymbol
    socketSeqRef.current += 1

    const socketSeq = socketSeqRef.current

    // Critical: reset all accumulators whenever the pair changes.
    cvdRef.current = 0
    buyRef.current = 0
    sellRef.current = 0
    tradesRef.current = []

    setFlow(emptyFlow(currentSymbol))

    if (!currentSymbol) return

    let ws: WebSocket | null = null
    let mounted = true
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${currentSymbol.toLowerCase()}@aggTrade`,
      )

      ws.onmessage = (event) => {
        if (!mounted) return

        // Ignore late messages from a previous symbol/socket.
        if (
          activeSymbolRef.current !== currentSymbol ||
          socketSeqRef.current !== socketSeq
        ) {
          return
        }

        const data = JSON.parse(event.data)

        const price = Number(data.p)
        const qty = Number(data.q)
        const time = Number(data.T)

        if (!Number.isFinite(price) || !Number.isFinite(qty)) return

        // Binance aggTrade:
        // m === true means buyer is maker, so taker was seller.
        const isSell = Boolean(data.m)
        const side: TradeSide = isSell ? "sell" : "buy"

        if (isSell) {
          sellRef.current += qty
          cvdRef.current -= qty
        } else {
          buyRef.current += qty
          cvdRef.current += qty
        }

        const trade: FlowTrade = {
          price,
          qty,
          side,
          time,
          value: price * qty,
          symbol: currentSymbol,
        }

        tradesRef.current = [trade, ...tradesRef.current].slice(0, 200)

        const buyVolume = buyRef.current
        const sellVolume = sellRef.current
        const totalVolume = Math.max(1, buyVolume + sellVolume)

        setFlow({
          symbol: currentSymbol,
          buyVolume,
          sellVolume,
          buyPressure: Math.round((buyVolume / totalVolume) * 100),
          sellPressure: Math.round((sellVolume / totalVolume) * 100),
          delta: buyVolume - sellVolume,
          cvd: cvdRef.current,
          trades: tradesRef.current,
        })
      }

      ws.onclose = () => {
        if (!mounted) return
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [symbol])

  return flow
}
