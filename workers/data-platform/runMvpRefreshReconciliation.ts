import { createMvpRefreshClientFromEnvironment, MvpRefreshStore, buildRefreshSlotResumePlan, classifyNonterminalAttempt, reconcileCommittedAttempts } from "@/lib/data-platform/mvp-refresh"
import { createMvpServingClientFromEnvironment } from "@/lib/data-platform/mvp-serving"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

function checkpointSummary(checkpoint: Readonly<Record<string, unknown>>): object {
  const results = Array.isArray(checkpoint.canonicalCommitResults) ? checkpoint.canonicalCommitResults : []
  return Object.freeze({
    keys: Object.freeze(Object.keys(checkpoint).sort()),
    retrievalIdentity: typeof checkpoint.retrievalIdentity === "string" ? checkpoint.retrievalIdentity : null,
    rawArtifactIdentity: typeof checkpoint.rawArtifactIdentity === "string" ? checkpoint.rawArtifactIdentity : null,
    sourceChecksum: typeof checkpoint.sourceChecksum === "string" ? checkpoint.sourceChecksum : null,
    artifactChecksum: typeof checkpoint.artifactChecksum === "string" ? checkpoint.artifactChecksum : null,
    factDigest: typeof checkpoint.factDigest === "string" ? checkpoint.factDigest : null,
    canonicalOutputs: Object.freeze(results.map((value) => {
      const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
      return Object.freeze({ candidateId: typeof record.candidateId === "string" ? record.candidateId : null, canonicalRecordId: typeof record.canonicalRecordId === "string" ? record.canonicalRecordId : null, status: typeof record.status === "string" ? record.status : null })
    })),
  })
}

async function main(): Promise<void> {
  const refresh = createMvpRefreshClientFromEnvironment()
  const serving = createMvpServingClientFromEnvironment("PUBLISHER")
  try {
    await refresh.verify()
    await serving.verify()
    const attempts = await new MvpRefreshStore(refresh).auditUnitsForWindow(START, END)
    const plan = buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts, sourceFinalizationState: "SOURCE_AVAILABLE" })
    const btcAttempts = attempts.filter((attempt) => attempt.dataset === "ohlcv" && attempt.instrument === "BTCUSDT")
    const resolution = reconcileCommittedAttempts(btcAttempts)
    const servingState = await serving.sql.unsafe<Array<{ published: number; inactive: number; active_exposure: number }>>("SELECT count(*) FILTER (WHERE lifecycle='PUBLISHED')::int published,count(*) FILTER (WHERE lifecycle<>'PUBLISHED')::int inactive,(SELECT count(*)::int FROM serving.serving_exposure WHERE exposure_state='CONSUMER_VISIBLE') active_exposure FROM serving.serving_corpus")
    const byAction = Object.fromEntries(["REUSE_COMMITTED", "CREATE_NEW_ON_LIVE_RESUME", "BLOCKED_CONFLICT"].map((action) => [action, plan.filter((entry) => entry.action === action).length]))
    console.log(JSON.stringify({
      targetWindow: { start: START, end: END },
      servingState: servingState[0] ?? { published: 0, inactive: 0, active_exposure: 0 },
      attempts: attempts.map((attempt) => ({
        runId: attempt.runId,
        unitId: attempt.unitId,
        logicalKey: `${attempt.dataset}:${attempt.instrument}:${attempt.intervalStart}:${attempt.intervalEnd}`,
        instrument: attempt.instrument,
        dataset: attempt.dataset,
        state: attempt.state,
        unitChecksum: attempt.unitChecksum,
        checkpoint: checkpointSummary(attempt.checkpoint),
        artifacts: attempt.artifacts,
        events: attempt.events,
        lease: attempt.lease,
      })),
      committedResolution: resolution,
      nonterminalClassifications: btcAttempts.filter((attempt) => attempt.state === "ACQUIRED").map((attempt) => ({ unitId: attempt.unitId, classification: classifyNonterminalAttempt(attempt, resolution) })),
      dryRun: { totalSlots: plan.length, byAction, slots: plan },
      mutations: { unitsCreated: 0, canonicalWrites: 0, servingWrites: 0, exposureWrites: 0 },
    }, null, 2))
  } finally {
    await Promise.allSettled([refresh.shutdown(), serving.shutdown()])
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "MVP_REFRESH_RECONCILIATION_FAILED")
  process.exitCode = 1
})
