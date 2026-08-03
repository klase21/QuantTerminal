import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { inspectD4RuntimeTarget } from "@/lib/data-platform/consistency-evidence/postgres/safety"
import { inspectMvpServingIsolatedTarget } from "@/lib/data-platform/mvp-serving/safety"
import { createLiveResumeD4Environment } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"
import {
  LIVE_RESUME_REQUIRED_BINDING_NAMES,
  composeLocalLiveResumeEnvironment,
  createLocalLiveResumeEnvironment,
  createLiveResumeEnvironmentFromProcessEnv,
  inspectLocalLiveResumeEnvironment,
  preflightLocalLiveResumeEnvironment,
  type LiveResumeBindingCapability,
  type LiveResumeCoordinatorPorts,
} from "@/lib/data-platform/mvp-refresh"

function capability(bindingName: string, callable = true): LiveResumeBindingCapability {
  return Object.freeze({ bindingName, configured: true, localOnly: true, expectedDatabase: true, expectedRole: true, callable, mode: "APPEND_ONLY", supportedDatasets: Object.freeze([]), supportedInstruments: Object.freeze([]), exactIntervalLimitHours: null, legacyWorkerDependency: false, activationCapable: false, diagnostic: "READY", limitationReason: callable ? null : "TEST_BLOCKED", sanitizedErrorCode: null })
}

async function main() {
  assert.equal(new Set(LIVE_RESUME_REQUIRED_BINDING_NAMES).size, LIVE_RESUME_REQUIRED_BINDING_NAMES.length)
  assert.equal(LIVE_RESUME_REQUIRED_BINDING_NAMES.includes("ohlcv-executor"), true)
  assert.equal(LIVE_RESUME_REQUIRED_BINDING_NAMES.includes("open-interest-executor"), true)
  assert.equal(LIVE_RESUME_REQUIRED_BINDING_NAMES.includes("funding-executor"), true)
  assert.equal(LIVE_RESUME_REQUIRED_BINDING_NAMES.includes("agg-trades-executor"), true)
  assert.equal(LIVE_RESUME_REQUIRED_BINDING_NAMES.includes("local-candidate-assembler"), true)
  assert.equal(LIVE_RESUME_REQUIRED_BINDING_NAMES.includes("candidate-activation" as never), false)

  const missing = await preflightLocalLiveResumeEnvironment({} as NodeJS.ProcessEnv)
  assert.equal(missing.passed, false)
  assert.equal(missing.productionOrNeonWriteTarget, false)
  assert.equal(missing.capabilities.filter((value) => value.diagnostic === "VARIABLE_MISSING").length >= 5, true)
  assert.equal(missing.capabilities.some((value) => value.activationCapable), false)
  assert.equal(missing.capabilities.find((value) => value.bindingName === "candidate-activation")?.callable, false)
  const inspected = inspectLocalLiveResumeEnvironment({} as NodeJS.ProcessEnv)
  assert.equal(inspected.length, missing.capabilities.length)
  assert.equal(inspected.every((value) => !value.callable), true)
  const inspectFactory = await createLocalLiveResumeEnvironment({ mode: "INSPECT", environment: {} as NodeJS.ProcessEnv })
  assert.equal(inspectFactory.ports, null)
  assert.equal(inspectFactory.passed, true)

  const certificationOnly = inspectLocalLiveResumeEnvironment({ D2_ISOLATED_POSTGRES_URL: "configured", D3_ISOLATED_POSTGRES_URL: "configured" } as unknown as NodeJS.ProcessEnv)
  assert.equal(certificationOnly.find((value) => value.bindingName === "d2-canonical-persistence")?.diagnostic, "VARIABLE_MISSING")
  assert.equal(certificationOnly.find((value) => value.bindingName === "d3-candidate-persistence")?.diagnostic, "VARIABLE_MISSING")
  const hybrid = inspectLocalLiveResumeEnvironment({ D2_CANONICAL_POSTGRES_URL: "configured", D3_POPULATION_POSTGRES_URL: "configured" } as unknown as NodeJS.ProcessEnv)
  assert.equal(hybrid.find((value) => value.bindingName === "d2-canonical-persistence")?.limitationReason, "PREFLIGHT_REQUIRED")
  assert.equal(hybrid.find((value) => value.bindingName === "d3-candidate-persistence")?.limitationReason, "PREFLIGHT_REQUIRED")
  const bootstrapSource = readFileSync("lib/data-platform/mvp-refresh/liveResumeLocalBootstrap.ts", "utf8")
  const environmentSource = readFileSync("lib/data-platform/mvp-refresh/liveResumeEnvironment.ts", "utf8")
  const workerSource = readFileSync("workers/data-platform/runMvpLiveResume.ts", "utf8")
  assert.equal(bootstrapSource.includes("createIntegratedBackfillClientsFromEnvironment"), true)
  assert.equal(bootstrapSource.includes("persistBoundedAcquisitionResult"), true)
  assert.equal(bootstrapSource.includes("boundedLineageProbe"), true)
  assert.equal(bootstrapSource.includes("boundedRawObjectProbe"), true)
  assert.equal(bootstrapSource.includes("recordRecoverableLineageFailure"), true)
  assert.equal(bootstrapSource.includes("for (const candidate of candidates) { const result = await input.d3.persistCandidate"), false)
  assert.equal(workerSource.includes("auditBoundedAcquisitionLineage"), true)
  assert.equal(bootstrapSource.includes('required(input.environment, "D2_ISOLATED_POSTGRES_URL")'), false)
  assert.equal(bootstrapSource.includes('required(input.environment, "D3_ISOLATED_POSTGRES_URL")'), false)
  assert.equal(environmentSource.includes('["D2_CANONICAL_POSTGRES_URL", "quantterminal_backfill", "qt_d2_backfill_owner"'), true)
  assert.equal(environmentSource.includes('["D3_POPULATION_POSTGRES_URL", "quantterminal_backfill", "qt_d3_backfill_owner"'), true)
  assert.equal(environmentSource.includes('requirements.find((value) => value[3] === "inactive-candidate-serving")'), true)
  assert.equal(environmentSource.includes('throw new Error("LIVE_RESUME_SERVING_REQUIREMENT_MISSING")'), true)
  assert.equal(environmentSource.includes("database: servingRequirement[1]"), true)
  assert.equal(environmentSource.includes("role: servingRequirement[2]"), true)
  assert.equal(workerSource.includes("D2_ISOLATED_POSTGRES_URL"), false)
  assert.equal(workerSource.includes("D3_ISOLATED_POSTGRES_URL"), false)

  const cleanServingEnvironment = {
    MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
    MVP_GREEN_CLEAN_REBUILD_ID: "dispose20260731a",
    MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: "quantterminal_green_clean_dispose20260731a_backfill",
    MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "quantterminal_green_clean_dispose20260731a_d4",
    MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: "quantterminal_green_clean_dispose20260731a_refresh",
    MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: "quantterminal_green_clean_dispose20260731a_serving",
  } as unknown as NodeJS.ProcessEnv
  const cleanServingUrl = "postgresql://mvp_serving_publisher:redacted@127.0.0.1:55432/quantterminal_green_clean_dispose20260731a_serving"
  const cleanServingInspection = inspectMvpServingIsolatedTarget(cleanServingUrl, cleanServingEnvironment, {
    database: cleanServingEnvironment.MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE!,
    role: "mvp_serving_publisher",
  })
  assert.equal(cleanServingInspection.safe, true)
  assert.equal(cleanServingInspection.database, "quantterminal_green_clean_dispose20260731a_serving")
  assert.equal(cleanServingInspection.role, "mvp_serving_publisher")
  assert.equal(inspectMvpServingIsolatedTarget(cleanServingUrl.replace("dispose20260731a_serving", "wrong_serving"), cleanServingEnvironment, { database: cleanServingEnvironment.MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE!, role: "mvp_serving_publisher" }).safe, false)
  assert.equal(inspectMvpServingIsolatedTarget(cleanServingUrl.replace("127.0.0.1", "db.example.invalid"), cleanServingEnvironment, { database: cleanServingEnvironment.MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE!, role: "mvp_serving_publisher" }).safe, false)
  assert.equal(environmentSource.includes('derivedCapability("candidate-activation", { ...serving, callable: false, diagnostic: "READY", limitationReason: "ACTIVATION_INTENTIONALLY_UNAVAILABLE" }'), true)

  const cleanD4Url = "postgresql://qt_d2_owner:redacted@127.0.0.1:55432/quantterminal_green_clean_dispose20260731a_d4"
  const childPathD4Environment = createLiveResumeD4Environment({ ...cleanServingEnvironment, D4_ISOLATED_POSTGRES_URL: cleanD4Url })
  assert.equal(childPathD4Environment.D4_EXPECTED_DATABASE_NAME, "quantterminal_green_clean_dispose20260731a_d4")
  assert.equal(inspectD4RuntimeTarget(cleanD4Url, childPathD4Environment).safe, true)
  assert.equal((bootstrapSource.match(/environment: d4Environment/g) ?? []).length, 4)
  assert.equal(bootstrapSource.includes("const d4Environment = createLiveResumeD4Environment(input.environment)"), true)

  const ports = Object.freeze({}) as LiveResumeCoordinatorPorts
  const complete = LIVE_RESUME_REQUIRED_BINDING_NAMES.map((name) => capability(name))
  assert.equal(composeLocalLiveResumeEnvironment({ ports, capabilities: [...complete, capability("candidate-activation", false)] }), ports)
  assert.throws(() => composeLocalLiveResumeEnvironment({ ports, capabilities: complete.map((value, index) => index === 0 ? { ...value, expectedRole: false } : value) }), /BINDING_INCOMPLETE/)
  assert.throws(() => composeLocalLiveResumeEnvironment({ ports, capabilities: [...complete, capability("candidate-activation", true)] }), /ACTIVATION_BINDING_FORBIDDEN/)
  const certification = await createLocalLiveResumeEnvironment({ mode: "CERTIFICATION", bindings: { ports, capabilities: [...complete, capability("candidate-activation", false)] } })
  assert.equal(certification.ports, ports)
  await certification.close()
  await assert.rejects(() => createLocalLiveResumeEnvironment({ mode: "CERTIFICATION" }), /CERTIFICATION_BINDINGS_REQUIRED/)

  let factoryCalls = 0, closeCalls = 0
  const authenticated = await createLiveResumeEnvironmentFromProcessEnv({
    mode: "CERTIFICATION",
    environment: {} as NodeJS.ProcessEnv,
    preflight: async () => Object.freeze({ version: "mvp-live-resume-environment/1.0.0", passed: true, capabilities: Object.freeze([...complete, capability("candidate-activation", false)]), productionOrNeonWriteTarget: false }),
    createBindings: async () => { factoryCalls++; return { ports, capabilities: [...complete, capability("candidate-activation", false)], close: async () => { closeCalls++ } } },
  })
  assert.equal(authenticated.ports, ports)
  assert.equal(factoryCalls, 1)
  await authenticated.close()
  assert.equal(closeCalls, 1)

  let partialCloseCalls = 0
  await assert.rejects(() => createLiveResumeEnvironmentFromProcessEnv({
    mode: "CERTIFICATION",
    environment: {} as NodeJS.ProcessEnv,
    preflight: async () => Object.freeze({ version: "mvp-live-resume-environment/1.0.0", passed: true, capabilities: Object.freeze([...complete, capability("candidate-activation", true)]), productionOrNeonWriteTarget: false }),
    createBindings: async () => ({ ports, capabilities: complete, close: async () => { partialCloseCalls++ } }),
  }), /ACTIVATION_BINDING_FORBIDDEN/)
  assert.equal(partialCloseCalls, 1)

  let blockedFactoryCalls = 0
  const authBlocked = await createLiveResumeEnvironmentFromProcessEnv({
    mode: "PREFLIGHT",
    environment: {} as NodeJS.ProcessEnv,
    preflight: async () => Object.freeze({ version: "mvp-live-resume-environment/1.0.0", passed: false, capabilities: Object.freeze([capability("d2-canonical-persistence", false)]), productionOrNeonWriteTarget: false }),
    createBindings: async () => { blockedFactoryCalls++; return { ports, capabilities: complete } },
  })
  assert.equal(authBlocked.passed, false)
  assert.equal(authBlocked.ports, null)
  assert.equal(blockedFactoryCalls, 0)

  console.log(JSON.stringify({ status: "PASS", requiredBindings: LIVE_RESUME_REQUIRED_BINDING_NAMES.length, factoryModes: 4, authoritativeFactory: true, activationCapable: false, externalMutation: false }))
}

void main().catch((error) => { console.error(error); process.exitCode = 1 })
