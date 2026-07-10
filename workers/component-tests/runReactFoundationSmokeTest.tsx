import path from "node:path"
import { fileURLToPath } from "node:url"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { EvidenceCard, MetricCard, ReasoningCard } from "@/components/evidence"
import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { RepositoryLink } from "@/components/navigation"
import { IconButton } from "@/components/ui/foundation"
import { previewEvidence, previewReasoning, previewUnavailableEvidence } from "@/lib/design-system/fixtures/preview"

interface Check { readonly name: string; readonly passed: boolean; readonly detail: string }

function runReactFoundationSmokeTest() {
  const checks: Check[] = []
  const check = (name: string, passed: boolean, detail: string) => checks.push({ name, passed, detail })

  const lifecycleMarkup = renderToStaticMarkup(<StatePanel state="ERROR" title="Example error" reason="Synthetic failure" />)
  check("Error lifecycle uses alert semantics", lifecycleMarkup.includes('role="alert"'), lifecycleMarkup)

  const availabilityMarkup = renderToStaticMarkup(<AvailabilityBadge availability={{ state: "EXPERIMENTAL", reason: "Synthetic provider" }} />)
  check("Experimental availability has textual state", availabilityMarkup.includes("EXPERIMENTAL") && availabilityMarkup.includes('role="status"'), availabilityMarkup)

  const evidenceMarkup = renderToStaticMarkup(<EvidenceCard evidence={previewEvidence} variant="expanded" />)
  check("Evidence renders source and limitation", evidenceMarkup.includes("Example fixture") && evidenceMarkup.includes("Not current market evidence"), evidenceMarkup)

  const unavailableMarkup = renderToStaticMarkup(<EvidenceCard evidence={previewUnavailableEvidence} variant="expanded" />)
  check("Unavailable evidence renders reason", unavailableMarkup.includes("Example source was not supplied") && !unavailableMarkup.includes(">0<"), unavailableMarkup)

  const missingMetricMarkup = renderToStaticMarkup(<MetricCard metric={{ id: "missing", label: "Missing metric", lifecycle: "READY", availability: { state: "MISSING", reason: "Not supplied" }, value: null }} />)
  check("Missing metric is not rendered as zero or neutral", missingMetricMarkup.includes("MISSING: Not supplied") && !missingMetricMarkup.includes(">0<") && !missingMetricMarkup.includes("NEUTRAL"), missingMetricMarkup)

  const zeroMetricMarkup = renderToStaticMarkup(<MetricCard metric={{ id: "zero", label: "Observed zero", lifecycle: "READY", availability: { state: "AVAILABLE" }, value: 0 }} />)
  check("A supplied factual zero remains renderable", zeroMetricMarkup.includes(">0<"), zeroMetricMarkup)

  const blockedReasoningMarkup = renderToStaticMarkup(<ReasoningCard reasoning={{ ...previewReasoning, summary: "Forbidden unsupported conclusion", supportingEvidence: [], unavailableReason: "Evidence references missing" }} />)
  check("Reasoning is blocked without evidence references", blockedReasoningMarkup.includes("Evidence references missing") && !blockedReasoningMarkup.includes("Forbidden unsupported conclusion"), blockedReasoningMarkup)

  const repositoryMarkup = renderToStaticMarkup(<RepositoryLink handoff={{ available: false, unavailableReason: "No record" }} />)
  check("Unavailable Repository handoff omits link", repositoryMarkup.includes("Repository unavailable") && !repositoryMarkup.includes("<a"), repositoryMarkup)

  const iconButtonMarkup = renderToStaticMarkup(<IconButton accessibleName="Open example">+</IconButton>)
  check("Icon-only action has accessible name", iconButtonMarkup.includes('aria-label="Open example"'), iconButtonMarkup)

  const failed = checks.filter((item) => !item.passed)
  process.stdout.write(`REACT FOUNDATION SMOKE TEST: ${failed.length ? "FAIL" : "PASS"}\n`)
  for (const item of checks) process.stdout.write(`[${item.passed ? "PASS" : "FAIL"}] ${item.name}: ${item.detail}\n`)
  if (failed.length) process.exitCode = 1
  return { status: failed.length ? "FAIL" as const : "PASS" as const, checks }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runReactFoundationSmokeTest()

export { runReactFoundationSmokeTest }
