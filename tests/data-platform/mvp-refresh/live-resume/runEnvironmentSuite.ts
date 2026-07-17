import assert from "node:assert/strict"

import {
  LIVE_RESUME_REQUIRED_BINDING_NAMES,
  composeLocalLiveResumeEnvironment,
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

  const ports = Object.freeze({}) as LiveResumeCoordinatorPorts
  const complete = LIVE_RESUME_REQUIRED_BINDING_NAMES.map((name) => capability(name))
  assert.equal(composeLocalLiveResumeEnvironment({ ports, capabilities: [...complete, capability("candidate-activation", false)] }), ports)
  assert.throws(() => composeLocalLiveResumeEnvironment({ ports, capabilities: complete.map((value, index) => index === 0 ? { ...value, expectedRole: false } : value) }), /BINDING_INCOMPLETE/)
  assert.throws(() => composeLocalLiveResumeEnvironment({ ports, capabilities: [...complete, capability("candidate-activation", true)] }), /ACTIVATION_BINDING_FORBIDDEN/)

  console.log(JSON.stringify({ status: "PASS", requiredBindings: LIVE_RESUME_REQUIRED_BINDING_NAMES.length, activationCapable: false, externalMutation: false }))
}

void main().catch((error) => { console.error(error); process.exitCode = 1 })
