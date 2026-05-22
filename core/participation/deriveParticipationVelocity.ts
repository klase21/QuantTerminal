import { clamp } from "@/core/shared/metrics"
import type { ParticipationTemperature, ParticipationVelocityInput, ParticipationVelocityItem } from "./participationTypes"

function temperatureFor(velocity: number, acceleration: number): ParticipationTemperature {
  if (velocity >= 82 || acceleration >= 78) return "Overheating"
  if (velocity >= 68) return "High Participation"
  if (velocity >= 52) return "Active"
  if (velocity >= 34) return "Emerging"
  return "Quiet"
}

function labelFor(temperature: ParticipationTemperature) {
  switch (temperature) {
    case "Overheating":
      return "Overheating"
    case "High Participation":
      return "High Participation"
    case "Active":
      return "Active Participation"
    case "Emerging":
      return "Emerging Participation"
    default:
      return "Quiet"
  }
}

function summaryFor(item: ParticipationVelocityItem) {
  if (item.temperature === "Overheating") return `${item.narrative} participation is accelerating quickly; watch for crowding.`
  if (item.temperature === "High Participation") return `${item.narrative} has broad participation with improving flow.`
  if (item.temperature === "Active") return `${item.narrative} is active but still needs stronger confirmation.`
  if (item.temperature === "Emerging") return `${item.narrative} is starting to attract participation.`
  return `${item.narrative} participation remains quiet.`
}

export function deriveParticipationVelocity(inputs: ParticipationVelocityInput[]): ParticipationVelocityItem[] {
  return inputs.map((input) => {
    const newsBuzz = input.newsBuzz ?? 0
    const confirmation = input.confirmation ?? 0
    const acceleration = clamp(
      input.volumePressure * 0.34 +
        newsBuzz * 0.24 +
        input.premiumBoost * 0.16 +
        Math.max(0, input.rotationScore - input.breadth) * 0.14 +
        confirmation * 0.12
    )
    const breadthSupport = clamp(input.breadth * 0.72 + confirmation * 0.28)
    const velocity = clamp(
      input.volumePressure * 0.30 +
        input.breadth * 0.24 +
        input.rotationScore * 0.20 +
        newsBuzz * 0.16 +
        input.premiumBoost * 0.10
    )
    const temperature = temperatureFor(velocity, acceleration)
    const item: ParticipationVelocityItem = {
      narrative: input.narrative,
      velocity,
      temperature,
      acceleration,
      breadthSupport,
      participationLabel: labelFor(temperature),
      summary: "",
    }
    return {
      ...item,
      summary: summaryFor(item),
    }
  })
}
