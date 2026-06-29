import {
  determineDirectionCorrectness,
  determineInvalidationStatus,
  directionAdjustedReturn,
} from "@/lib/signal-evaluation/direction"
import { determineOutcomeStatus } from "@/lib/signal-evaluation/outcomeStatus"
import {
  SIGNAL_EVALUATION_SCHEMA_VERSION,
  type SignalEvaluationInput,
  type SignalEvaluationMetrics,
  type SignalEvaluationOperationResult,
  type SignalEvaluationResult,
} from "@/lib/signal-evaluation/types"
import { validateSignalEvaluationInput } from "@/lib/signal-evaluation/validation"

const MISSING_PRICE_CODES = new Set([
  "missing_entry_price",
  "missing_observation_price",
])

export const UNAVAILABLE_SIGNAL_METRICS: SignalEvaluationMetrics = Object.freeze({
  returnPercent: null,
  maxFavorableExcursion: null,
  maxAdverseExcursion: null,
  drawdown: null,
  runup: null,
  timeToMaxFavorable: null,
  timeToMaxAdverse: null,
  invalidationHit: null,
  directionCorrect: null,
  outcomeStatus: "UNAVAILABLE",
})

function freezeMetrics(metrics: SignalEvaluationMetrics): SignalEvaluationMetrics {
  return Object.freeze({ ...metrics })
}

export function freezeSignalEvaluationResult(
  evaluation: SignalEvaluationResult,
): SignalEvaluationResult {
  return Object.freeze({
    ...evaluation,
    signalReference: Object.freeze({ ...evaluation.signalReference }),
    window: Object.freeze({ ...evaluation.window }),
    metrics: evaluation.metrics ? freezeMetrics(evaluation.metrics) : null,
  })
}

function unavailableResult(
  input: SignalEvaluationInput,
  reason: string,
): SignalEvaluationOperationResult<SignalEvaluationResult> {
  return {
    success: true,
    value: freezeSignalEvaluationResult({
      schemaVersion: SIGNAL_EVALUATION_SCHEMA_VERSION,
      signalReference: input.signalReference,
      window: input.window,
      direction: input.direction,
      status: "UNAVAILABLE",
      metrics: UNAVAILABLE_SIGNAL_METRICS,
      unavailableReason: reason,
    }),
  }
}

function percentageChange(from: number, to: number): number {
  return ((to - from) / from) * 100
}

function pathDrawdown(prices: readonly number[]): number {
  let peak = prices[0]
  let maximumDrawdown = 0
  for (const price of prices) {
    if (price > peak) peak = price
    maximumDrawdown = Math.max(maximumDrawdown, ((peak - price) / peak) * 100)
  }
  return maximumDrawdown
}

function pathRunup(prices: readonly number[]): number {
  let trough = prices[0]
  let maximumRunup = 0
  for (const price of prices) {
    if (price < trough) trough = price
    maximumRunup = Math.max(maximumRunup, ((price - trough) / trough) * 100)
  }
  return maximumRunup
}

export function evaluateSignalWindow(
  input: SignalEvaluationInput,
): SignalEvaluationOperationResult<SignalEvaluationResult> {
  const validation = validateSignalEvaluationInput(input)
  if (validation.success === false) {
    if (validation.errors.every((error) => MISSING_PRICE_CODES.has(error.code))) {
      return unavailableResult(input, validation.errors.map((error) => error.message).join(" "))
    }
    return validation
  }

  const validInput = validation.value
  const entryPrice = validInput.entryPrice!
  const observationPrices = validInput.observations.map((observation) => observation.price!)
  const prices = [entryPrice, ...observationPrices]
  const timestamps = [
    Date.parse(validInput.window.startsAt),
    ...validInput.observations.map((observation) => Date.parse(observation.observedAt)),
  ]
  const rawReturns = prices.map((price) => percentageChange(entryPrice, price))
  const returnPercent = rawReturns[rawReturns.length - 1]

  let maxFavorableExcursion: number | null = null
  let maxAdverseExcursion: number | null = null
  let timeToMaxFavorable: number | null = null
  let timeToMaxAdverse: number | null = null

  if (validInput.direction !== "NEUTRAL") {
    const adjustedReturns = rawReturns.map((value) => directionAdjustedReturn(validInput.direction, value)!)
    maxFavorableExcursion = Math.max(...adjustedReturns)
    maxAdverseExcursion = Math.min(...adjustedReturns)
    const favorableIndex = adjustedReturns.indexOf(maxFavorableExcursion)
    const adverseIndex = adjustedReturns.indexOf(maxAdverseExcursion)
    timeToMaxFavorable = timestamps[favorableIndex] - timestamps[0]
    timeToMaxAdverse = timestamps[adverseIndex] - timestamps[0]
  }

  const metrics = freezeMetrics({
    returnPercent,
    maxFavorableExcursion,
    maxAdverseExcursion,
    drawdown: pathDrawdown(prices),
    runup: pathRunup(prices),
    timeToMaxFavorable,
    timeToMaxAdverse,
    invalidationHit: determineInvalidationStatus(
      validInput.direction,
      validInput.invalidationPrice,
      prices,
    ),
    directionCorrect: determineDirectionCorrectness(validInput.direction, returnPercent),
    outcomeStatus: determineOutcomeStatus(validInput.direction, returnPercent),
  })

  return {
    success: true,
    value: freezeSignalEvaluationResult({
      schemaVersion: SIGNAL_EVALUATION_SCHEMA_VERSION,
      signalReference: validInput.signalReference,
      window: validInput.window,
      direction: validInput.direction,
      status: "EVALUATED",
      metrics,
      unavailableReason: null,
    }),
  }
}
