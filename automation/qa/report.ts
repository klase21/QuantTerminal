import type {
  QaCommandResult,
  QaHarnessReport,
  QaReportStatus,
  QaSchemaCheckResult,
} from "./types";

function toSchemaCheck(check: QaCommandResult): QaSchemaCheckResult {
  return {
    name: check.name,
    status: check.status,
    command: check.command,
    summary: check.summary,
    reason: check.reason,
  };
}

function skippedCheck(name: string, summary: string): QaSchemaCheckResult {
  return {
    name,
    status: "skipped",
    command: null,
    summary,
  };
}

function determineStatus(checks: QaCommandResult[]): QaReportStatus {
  if (checks.some((check) => check.status === "blocked")) {
    return "blocked";
  }

  if (checks.some((check) => check.status === "failed")) {
    return "failed";
  }

  return "passed";
}

export function buildQaReport(checks: QaCommandResult[], taskId?: string): QaHarnessReport {
  const tscCheck = checks.find((check) => check.id === "typescript");
  const testChecks = checks.filter((check) => check.id === "intelligence_smoke_test");
  const auditChecks = checks.filter((check) => check.id === "dashboard_integration_audit");
  const failedChecks = checks.filter((check) => check.status !== "passed");
  const blockedChecks = checks.filter((check) => check.status === "blocked");

  const warnings = blockedChecks.length > 0
    ? ["QA stopped after a blocking command failed."]
    : [];

  const failures = failedChecks.map((check) => check.summary);

  return {
    task_id: taskId,
    status: determineStatus(checks),
    generatedAt: new Date().toISOString(),
    checks,
    tsc: tscCheck
      ? toSchemaCheck(tscCheck)
      : skippedCheck("TypeScript", "TypeScript check was not configured."),
    tests: testChecks.map(toSchemaCheck),
    audits: auditChecks.map(toSchemaCheck),
    warnings,
    failures,
  };
}
