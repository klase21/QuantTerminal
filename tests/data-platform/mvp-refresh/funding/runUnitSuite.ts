import assert from "node:assert/strict"
import { createHash } from "node:crypto"

import { BOUNDED_FUNDING_PROVIDER, MVP_FUNDING_INSTRUMENTS, createBoundedFundingRequest, createBoundedFundingSourceUrl, fundingMandatoryWatermark, parseBoundedFundingEvents, runBoundedFundingRefresh, type BoundedFundingRefreshRequest } from "@/lib/data-platform/mvp-refresh"
import type { CanonicalCommitPort } from "@/lib/data-platform/population/contracts"
import { InMemoryObjectStorage } from "@/lib/data-platform/population/testing"
import type { CanonicalCommitCommand, CanonicalCommitResult } from "@/lib/data-platform/persistence"

const START = "2026-07-14T00:00:00.000Z"
const END = "2026-07-15T00:00:00.000Z"
const NOW = "2026-07-15T03:00:00.000Z"
const RETRIEVED = "2026-07-15T03:01:00.000Z"

function request(instrument: typeof MVP_FUNDING_INSTRUMENTS[number] = "BTCUSDT"): BoundedFundingRefreshRequest {
  return createBoundedFundingRequest({ provider: BOUNDED_FUNDING_PROVIDER, instrument, eventTimeStart: START, eventTimeEnd: END, maximumEventCount: 10, requestedAt: NOW }, NOW)
}

function fixture(instrument = "BTCUSDT") {
  return JSON.stringify([
    { symbol: instrument, fundingTime: Date.parse(START), fundingRate: "0.00010000" },
    { symbol: instrument, fundingTime: Date.parse("2026-07-14T08:00:00.000Z"), fundingRate: "-0.00002000" },
    { symbol: instrument, fundingTime: Date.parse("2026-07-14T16:00:00.000Z"), fundingRate: "0.00000000" },
  ])
}

class FixtureCanonicalPort implements CanonicalCommitPort {
  constructor(private readonly duplicateOnly = false) {}
  async execute(command: CanonicalCommitCommand): Promise<CanonicalCommitResult> {
    if (this.duplicateOnly) return { status: "DUPLICATE", canonicalRecordId: command.fact.identity.canonicalRecordId, recordVersion: 1, checksum: command.fact.checksum }
    return { status: "SUCCESS", commit: { commitId: `fixture:${command.idempotencyKey}`, operationType: command.operationType, datasetId: "funding", providerId: command.fact.providerId, registrySnapshotId: command.fact.governance.datasetRegistrySnapshotId, providerSnapshotId: command.fact.governance.providerRegistrySnapshotId, policyVersionId: command.fact.governance.policyVersionId, providerCertificationSnapshotId: command.fact.governance.providerCertificationSnapshotId, schemaVersion: command.fact.governance.schemaVersion, normalizationVersion: command.fact.governance.normalizationVersion, initiatedAt: command.initiatedAt, committedAt: RETRIEVED, idempotencyKey: command.idempotencyKey, candidateCount: 1, committedRecordCount: 1 }, fact: { ...command.fact.identity, recordVersion: 1, factTable: "FUNDING" } }
  }
}

async function run(input: { request?: BoundedFundingRefreshRequest; body?: string; port?: CanonicalCommitPort; response?: Response } = {}) {
  const body = input.body ?? fixture(input.request?.instrument)
  return runBoundedFundingRefresh({ request: input.request ?? request(), storage: new InMemoryObjectStorage(), canonicalPort: input.port ?? new FixtureCanonicalPort(), retrievedAt: RETRIEVED, fetchImpl: async () => input.response ?? new Response(body, { status: 200 }) })
}

async function main() {
  const bounded = request()
  assert.equal(createBoundedFundingSourceUrl(bounded).searchParams.get("symbol"), "BTCUSDT")
  assert.throws(() => createBoundedFundingRequest({ ...bounded, provider: "invalid" as typeof BOUNDED_FUNDING_PROVIDER }, NOW), /SOURCE_MISMATCH/)
  assert.throws(() => createBoundedFundingRequest({ ...bounded, instrument: "btcusdt" as "BTCUSDT" }, NOW), /INSTRUMENT_INVALID/)
  assert.throws(() => createBoundedFundingRequest({ ...bounded, eventTimeStart: "2026-07-14" }, NOW), /START_INVALID/)
  assert.throws(() => createBoundedFundingRequest({ ...bounded, eventTimeEnd: START }, NOW), /INTERVAL_INVALID/)
  assert.throws(() => createBoundedFundingRequest({ ...bounded, eventTimeEnd: "2026-07-15T00:00:00.001Z" }, NOW), /EXCEEDS_MAXIMUM/)
  assert.throws(() => createBoundedFundingRequest({ ...bounded, eventTimeStart: "2026-07-15T00:00:00.000Z", eventTimeEnd: "2026-07-16T00:00:00.000Z" }, NOW), /FUTURE_INTERVAL/)

  const bytes = new TextEncoder().encode(fixture())
  const events = parseBoundedFundingEvents({ bytes, request: bounded, retrievalIdentity: "retrieval-fixture", rawArtifactIdentity: "artifact-fixture", observedAt: RETRIEVED })
  assert.deepEqual(events.map((event) => event.providerEventTimestamp), [START, "2026-07-14T08:00:00.000Z", "2026-07-14T16:00:00.000Z"])
  assert.deepEqual(events.map((event) => event.providerRateValue), ["0.00010000", "-0.00002000", "0.00000000"])
  assert.equal(events[0].sourceResponseChecksum, createHash("sha256").update(bytes).digest("hex"))
  assert(!/(interpolat|forward|synthetic)/i.test(JSON.stringify(events)))

  const created = await run()
  assert.equal(created.status, "CREATED")
  assert.equal(created.eventCount, 3)
  assert.equal(new Set(created.candidateIdentities).size, 3)
  assert.match(created.rawArtifactIdentity ?? "", /^raw:[0-9a-f]{64}$/)
  const duplicate = await run({ port: new FixtureCanonicalPort(true) })
  assert.equal(duplicate.status, "DUPLICATE")
  assert.equal(duplicate.duplicateCount, 3)
  assert.equal(created.requestIdentity, (await run()).requestIdentity)

  assert.equal((await run({ response: new Response("unavailable", { status: 503 }) })).status, "SOURCE_UNAVAILABLE")
  assert.equal((await run({ body: "[]" })).status, "NO_DATA")
  assert.equal((await run({ body: "not-json" })).status, "MALFORMED_SOURCE_DATA")
  assert.equal((await run({ body: JSON.stringify([{ symbol: "BTCUSDT", fundingTime: Date.parse(START), fundingRate: "not-a-number" }]) })).status, "MALFORMED_SOURCE_DATA")
  assert.equal((await run({ body: JSON.stringify([{ symbol: "BTCUSDT", fundingTime: Date.parse(END), fundingRate: "0.1" }]) })).status, "MALFORMED_SOURCE_DATA")
  assert.equal((await run({ body: JSON.stringify([{ symbol: "BTCUSDT", fundingTime: Date.parse(START), fundingRate: "0.1" }, { symbol: "BTCUSDT", fundingTime: Date.parse(START), fundingRate: "0.2" }]) })).status, "CANONICAL_CONFLICT")

  const allResults = await Promise.all(MVP_FUNDING_INSTRUMENTS.map((instrument) => run({ request: request(instrument), body: fixture(instrument) })))
  assert.equal(fundingMandatoryWatermark(allResults), END)
  assert.equal(fundingMandatoryWatermark(allResults.slice(1)), null)
  assert.equal(fundingMandatoryWatermark([...allResults.slice(0, -1), { ...allResults.at(-1)!, status: "SOURCE_GAP", coverageState: "PARTIAL" }]), null)

  console.log(JSON.stringify({ status: "PASS", provider: BOUNDED_FUNDING_PROVIDER, assertions: 27, fixtureInstrumentCount: 6, nativeEventsPerInstrument: 3, productionMutation: false }))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "BOUNDED_FUNDING_UNIT_TEST_FAILED"); process.exitCode = 1 })
