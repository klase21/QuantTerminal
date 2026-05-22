export type ParticipationTemperature = "Quiet" | "Emerging" | "Active" | "High Participation" | "Overheating"

export interface ParticipationVelocityInput {
  narrative: string
  rotationScore: number
  volumePressure: number
  breadth: number
  premiumBoost: number
  newsBuzz?: number
  confirmation?: number
}

export interface ParticipationVelocityItem {
  narrative: string
  velocity: number
  temperature: ParticipationTemperature
  acceleration: number
  breadthSupport: number
  participationLabel: string
  summary: string
}
