import { validateWatermark } from "@/lib/data-platform/contracts"
export const watermarkValid = validateWatermark({ datasetId: "agg-trade", kind: "AGG_TRADE_ID", value: "42", observedAt: "2026-07-12T00:00:00.000Z" })
