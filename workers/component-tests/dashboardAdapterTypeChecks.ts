import type {
  DashboardOpportunityViewModel,
  MarketDirectionViewModel,
} from "@/lib/dashboard/contracts"
import type { DashboardMarketDriverInput } from "@/lib/dashboard/adapters"

const direction: MarketDirectionViewModel = {
  symbol: "BTCUSDT",
  lifecycle: "READY",
  availability: { state: "AVAILABLE" },
  direction: "Bullish",
  freshness: { state: "CURRENT", observedAt: "2025-01-15T08:00:00.000Z" },
  coverage: { state: "PARTIAL", actualRecords: 3, expectedRecords: 8 },
  evidenceReadiness: {
    label: "Evidence Readiness",
    value: 37.5,
    basis: "Coverage multiplied by average evidence quality.",
  },
  contaminatedByHistoricalAnalog: false,
}

const opportunity: DashboardOpportunityViewModel = {
  id: "btc-example",
  symbol: "BTCUSDT",
  lifecycle: "PARTIAL",
  availability: { state: "AVAILABLE" },
  observedFacts: ["Symbol: BTCUSDT"],
  heuristicLabels: ["Heuristic direction: Bullish"],
  limitation: "No canonical evidence-reference lineage.",
}

const driverInput: DashboardMarketDriverInput = {
  symbol: "BTCUSDT",
  timestamp: "2025-01-15T08:00:00.000Z",
  marketDirection: "mixed",
  confidence: 25,
  drivers: [],
}

void direction
void opportunity
void driverInput

// @ts-expect-error Evidence readiness cannot be renamed to confidence.
const invalidReadiness: MarketDirectionViewModel = { ...direction, evidenceReadiness: { label: "Confidence", value: 50, basis: "Invalid" } }

// @ts-expect-error Lifecycle and availability are independent vocabularies.
const invalidLifecycle: MarketDirectionViewModel = { ...direction, lifecycle: "STALE" }

// @ts-expect-error Historical Analog category spelling is closed and explicit.
const invalidCategory: DashboardMarketDriverInput = { ...driverInput, availableCategories: ["historical"] }

void invalidReadiness
void invalidLifecycle
void invalidCategory

