import type {
  PredictionMarketEvent,
  PredictionMarketQuery,
  PredictionMarketRepository,
} from "./predictionMarketTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

const MOCK_PREDICTION_MARKETS: PredictionMarketEvent[] = [
  {
    id: "pm-btc-etf-inflow-continuation",
    title: "BTC ETF inflow continuation",
    venue: "polymarket",
    category: "flows",
    relatedAsset: "BTCUSDT",
    relatedNarrative: "ETF inflow continuation",
    marketQuestion: "Will BTC ETF net inflows remain positive through the next reporting window?",
    impliedProbability: 64,
    previousProbability: 58,
    probabilityChange: 6,
    crowdExpectation: "Crowd expects ETF demand to remain supportive, but not decisively one-sided.",
    marketDisagreementSignal: "medium",
    tacticalInterpretation: "Treat ETF flow as supportive only if spot demand confirms the probability move.",
    memoryLinkCandidate: "btc-etf-fade",
    relatedCaseIds: ["btc-etf-fade"],
    updatedAt: GENERATED_AT,
  },
  {
    id: "pm-fed-rate-cut-timing",
    title: "Fed rate cut timing",
    venue: "cme_fedwatch",
    category: "macro",
    relatedAsset: "BTCUSDT",
    relatedNarrative: "Expected FOMC hold with limited shock",
    marketQuestion: "Will the Fed keep policy unchanged at the next meeting?",
    impliedProbability: 91,
    previousProbability: 89,
    probabilityChange: 2,
    crowdExpectation: "Rate hold is heavily priced, reducing directional surprise unless guidance changes.",
    marketDisagreementSignal: "low",
    tacticalInterpretation: "Low surprise setup; wait for guidance or liquidity reaction before trading direction.",
    memoryLinkCandidate: "fomc-expected-hold-low-shock",
    relatedCaseIds: ["fomc-expected-hold-low-shock"],
    updatedAt: GENERATED_AT,
  },
  {
    id: "pm-eth-etf-staking-approval",
    title: "Ethereum ETF approval / staking ETF",
    venue: "kalshi",
    category: "crypto_policy",
    relatedAsset: "ETHUSDT",
    relatedNarrative: "ETH ETF approval odds repricing",
    marketQuestion: "Will regulators approve an ETH ETF or staking ETF path in the current cycle?",
    impliedProbability: 68,
    previousProbability: 42,
    probabilityChange: 26,
    crowdExpectation: "Crowd rapidly repriced approval odds after policy language improved.",
    marketDisagreementSignal: "high",
    tacticalInterpretation: "Large expectation repricing can validate continuation if the first reset holds.",
    memoryLinkCandidate: "eth-etf-approval-repricing",
    relatedCaseIds: ["eth-etf-approval-repricing"],
    updatedAt: GENERATED_AT,
  },
  {
    id: "pm-us-election-crypto-policy",
    title: "US election crypto policy",
    venue: "polymarket",
    category: "election",
    relatedAsset: "BTCUSDT",
    relatedNarrative: "Crypto policy repricing",
    marketQuestion: "Will the US election outcome be viewed as net positive for crypto policy?",
    impliedProbability: 57,
    previousProbability: 51,
    probabilityChange: 6,
    crowdExpectation: "Crowd leans toward policy support but remains split on execution impact.",
    marketDisagreementSignal: "medium",
    tacticalInterpretation: "Policy odds are a narrative input, not an execution trigger without flow confirmation.",
    memoryLinkCandidate: "btc-etf-fade",
    relatedCaseIds: ["btc-etf-fade"],
    updatedAt: GENERATED_AT,
  },
  {
    id: "pm-cpi-upside-surprise",
    title: "CPI upside surprise",
    venue: "kalshi",
    category: "macro",
    relatedAsset: "BTCUSDT",
    relatedNarrative: "Macro inflation shock",
    marketQuestion: "Will CPI print above consensus?",
    impliedProbability: 36,
    previousProbability: 31,
    probabilityChange: 5,
    crowdExpectation: "Crowd sees upside CPI risk, but not enough to dominate positioning.",
    marketDisagreementSignal: "medium",
    tacticalInterpretation: "Underpriced macro shock risk should raise caution around crowded longs.",
    memoryLinkCandidate: "fomc-expected-hold-low-shock",
    relatedCaseIds: ["fomc-expected-hold-low-shock"],
    updatedAt: GENERATED_AT,
  },
  {
    id: "pm-binance-regulatory-event",
    title: "Binance / major exchange regulatory event",
    venue: "internal_mock",
    category: "regulatory",
    relatedAsset: "BTCUSDT",
    relatedNarrative: "Exchange regulatory risk",
    marketQuestion: "Will a major exchange face a material regulatory action this quarter?",
    impliedProbability: 44,
    previousProbability: 47,
    probabilityChange: -3,
    crowdExpectation: "Crowd assigns meaningful tail risk, but probability is not accelerating.",
    marketDisagreementSignal: "medium",
    tacticalInterpretation: "Regulatory risk is background pressure unless probability rises with liquidity stress.",
    memoryLinkCandidate: "btc-spacex-ipo-selloff",
    relatedCaseIds: ["btc-spacex-ipo-selloff", "funding-overheated-long-squeeze"],
    updatedAt: GENERATED_AT,
  },
]

function includesText(value: string, query?: string) {
  if (!query) return true
  return value.toLowerCase().includes(query.toLowerCase())
}

function matchesQuery(event: PredictionMarketEvent, query?: PredictionMarketQuery) {
  if (!query) return true
  if (query.caseId && !event.relatedCaseIds.includes(query.caseId)) return false
  if (query.symbol && event.relatedAsset !== query.symbol) return false
  if (query.category && event.category !== query.category) return false
  if (query.narrative && !includesText(`${event.relatedNarrative} ${event.title}`, query.narrative)) return false
  return true
}

export const mockPredictionMarketRepository: PredictionMarketRepository = {
  listMarketEvents(query) {
    return MOCK_PREDICTION_MARKETS.filter((event) => matchesQuery(event, query)).slice(0, query?.limit)
  },
  getMarketEvent(id) {
    return MOCK_PREDICTION_MARKETS.find((event) => event.id === id) ?? null
  },
}
