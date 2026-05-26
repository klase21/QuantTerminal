export type AdaptiveRegime =
  | "TREND_EXPANSION"
  | "CHOPPY"
  | "RISK_OFF"
  | "SHORT_SQUEEZE"
  | "EARLY_EUPHORIA"

export interface RegimeWeights {
  rotation: number
  execution: number
  smartMoney: number
  narrative: number
  liquidity: number
  contradictionPenalty: number
}

export function getAdaptiveRegimeWeights(regime: AdaptiveRegime): RegimeWeights {
  switch (regime) {
    case "TREND_EXPANSION":
      return {
        rotation: 1.25,
        execution: 1.05,
        smartMoney: 1.15,
        narrative: 1.1,
        liquidity: 0.95,
        contradictionPenalty: 1.0,
      }

    case "CHOPPY":
      return {
        rotation: 0.85,
        execution: 1.25,
        smartMoney: 1.1,
        narrative: 0.8,
        liquidity: 1.25,
        contradictionPenalty: 1.35,
      }

    case "RISK_OFF":
      return {
        rotation: 0.75,
        execution: 1.2,
        smartMoney: 1.25,
        narrative: 0.7,
        liquidity: 1.3,
        contradictionPenalty: 1.45,
      }

    case "SHORT_SQUEEZE":
      return {
        rotation: 1.0,
        execution: 1.35,
        smartMoney: 1.15,
        narrative: 0.9,
        liquidity: 1.2,
        contradictionPenalty: 1.2,
      }

    case "EARLY_EUPHORIA":
      return {
        rotation: 1.15,
        execution: 1.0,
        smartMoney: 1.2,
        narrative: 1.3,
        liquidity: 1.0,
        contradictionPenalty: 1.3,
      }

    default:
      return {
        rotation: 1,
        execution: 1,
        smartMoney: 1,
        narrative: 1,
        liquidity: 1,
        contradictionPenalty: 1,
      }
  }
}
