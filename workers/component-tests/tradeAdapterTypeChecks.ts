import type { DecisionContextViewModel, DecisionSnapshotViewModel, TradeV2ViewModel } from "@/lib/trade-presentation/contracts"
import { buildTradeV2ViewModel } from "@/lib/trade-presentation/adapters"

type Assert<T extends true> = T
type IsAssignable<A, B> = A extends B ? true : false
type _Context = Assert<IsAssignable<TradeV2ViewModel["context"], DecisionContextViewModel>>
type _Snapshot = Assert<IsAssignable<TradeV2ViewModel["snapshot"], DecisionSnapshotViewModel>>
type _NoOrderEntry = Assert<IsAssignable<TradeV2ViewModel["snapshot"]["orderEntry"]["supported"], false>>
type _NoDurableIdentity = Assert<IsAssignable<TradeV2ViewModel["context"]["identity"]["durableDecisionId"], null>>

const model = buildTradeV2ViewModel({ candidateState: "empty", selected: null, candidates: [], replay: { contextId: null, label: "UNAVAILABLE", detail: "No context.", available: false }, observations: [], localHeuristicRisk: [], plan: null, records: [], hrefs: { replay: "/replay", research: "/research", markets: "/markets", scanner: "/scanner", dashboard: "/dashboard" } })
if (model.snapshot.orderEntry.supported) throw new Error("Order entry must remain unsupported.")
console.log("TRADE ADAPTER TYPE CHECKS: PASS")
