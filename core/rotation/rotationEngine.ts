export interface RotationFlow {
  from: string
  to: string
  strength: number
  acceleration: number
  confidence: number
}

export function buildRotationFlows() {
  return [
    { from: "AI", to: "RWA", strength: 82, acceleration: 11, confidence: 0.84 },
    { from: "MEME", to: "BTC", strength: 61, acceleration: 6, confidence: 0.73 },
  ]
}