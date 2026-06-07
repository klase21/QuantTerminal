import type { ScenarioSimulation, TacticalProbabilityResult } from "./predictiveTypes"

export function buildScenarioSimulation(probability: TacticalProbabilityResult): ScenarioSimulation[] {
  return [
    {
      scenario: "BTC breaks local high",
      expectedImpact: probability.direction === "LONG" ? "Leadership rotation accelerates into high beta." : "Short setup weakens; watch squeeze risk.",
      probabilityShift: probability.direction === "LONG" ? 9 : -8,
    },
    {
      scenario: "CVD diverges against price",
      expectedImpact: "Execution quality deteriorates; reduce conviction and wait for absorption read.",
      probabilityShift: -12,
    },
    {
      scenario: "Sell pressure fades while price holds",
      expectedImpact: "Absorption setup improves; reversal probability increases.",
      probabilityShift: 11,
    },
  ]
}
