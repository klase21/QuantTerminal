export interface OrderbookLevel {
  price: number
  qty: number
}

export interface OrderbookData {
  bids: OrderbookLevel[]
  asks: OrderbookLevel[]
  imbalance: number
}