import { validateReplayCapability } from "@/lib/data-platform/contracts"
export const replayValid = validateReplayCapability({ supported: true, granularity: "EVENT", boundedQuerySupport: true, sequenceSupport: true, snapshotSupport: false, rawRehydrationRequired: false, limitations: [] })
