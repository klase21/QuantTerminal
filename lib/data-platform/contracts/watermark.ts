export type WatermarkKind = "TIMESTAMP" | "PROVIDER_CURSOR" | "ARCHIVE_PARTITION" | "SEQUENCE" | "AGG_TRADE_ID" | "OBJECT_MANIFEST"

export interface DatasetWatermark {
  datasetId: string
  kind: WatermarkKind
  value: string
  observedAt: string
}

export interface PopulationWatermarks {
  currentCanonical: DatasetWatermark | null
  target: DatasetWatermark | null
  provider: DatasetWatermark | null
  projection: DatasetWatermark | null
  evidence: DatasetWatermark | null
  lag: { value: number; unit: "MILLISECONDS" | "RECORDS" | "PARTITIONS" } | null
  gapWindow: { from: string; to: string } | null
  checkpoint: string | null
  reconciliationState: "NOT_STARTED" | "IN_PROGRESS" | "MATCHED" | "GAP_DETECTED" | "FAILED"
}

export function validateWatermark(value: DatasetWatermark): boolean {
  return Boolean(value.datasetId && value.value && value.observedAt)
}
