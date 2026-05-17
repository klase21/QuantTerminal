export interface TickerData {
  symbol: string
  price: number
  change24h?: number
  volume?: number
  exchange: string
  timestamp: number
}

export interface SocketMessage {
  stream?: string
  data?: any
}