import { MVP_PROJECTION_DEFINITIONS, type MvpProjectionKind } from "./mvpProjections"

export type MvpProjectionExecutionScope = "INSTRUMENT_SCOPED" | "DATASET_AGGREGATE" | "CROSS_DATASET_AGGREGATE" | "REPLAY_OR_WATERMARK_DEPENDENT"

export const MVP_PROJECTION_SCOPE_MATRIX: Readonly<Record<MvpProjectionKind, MvpProjectionExecutionScope>> = Object.freeze({
  InstrumentMarketSummaryProjection: "INSTRUMENT_SCOPED",
  ReplayTimelineProjection: "INSTRUMENT_SCOPED",
  ResearchEvidenceProjection: "INSTRUMENT_SCOPED",
  CoverageDataStatusProjection: "INSTRUMENT_SCOPED",
  SourceLineageSummaryProjection: "INSTRUMENT_SCOPED",
  EventAnnotationProjection: "INSTRUMENT_SCOPED",
  ScannerCandidateProjection: "CROSS_DATASET_AGGREGATE",
  DashboardMarketStateProjection: "CROSS_DATASET_AGGREGATE",
  TradeDecisionContextProjection: "CROSS_DATASET_AGGREGATE",
  MacroContextProjection: "CROSS_DATASET_AGGREGATE",
  BitcoinEtfFlowProjection: "CROSS_DATASET_AGGREGATE",
})

export function projectionKindsForScope(scope: MvpProjectionExecutionScope, available = MVP_PROJECTION_DEFINITIONS.map((item) => item.projectionKind)): readonly MvpProjectionKind[] {
  const unknown = available.filter((kind) => !(kind in MVP_PROJECTION_SCOPE_MATRIX))
  if (unknown.length) throw new Error(`MVP_PROJECTION_SCOPE_UNKNOWN:${unknown.join(",")}`)
  return Object.freeze(available.filter((kind) => MVP_PROJECTION_SCOPE_MATRIX[kind] === scope).sort())
}

export function assertMvpProjectionKindsForScope(kinds: readonly MvpProjectionKind[], scope: MvpProjectionExecutionScope): void {
  if (!kinds.length) throw new Error("MVP_PROJECTION_SCOPE_EMPTY")
  for (const kind of kinds) {
    const actual = MVP_PROJECTION_SCOPE_MATRIX[kind]
    if (!actual) throw new Error(`MVP_PROJECTION_SCOPE_UNKNOWN:${kind}`)
    if (actual !== scope) throw new Error(`MVP_PROJECTION_SCOPE_MISMATCH:${kind}:${actual}:${scope}`)
  }
}
