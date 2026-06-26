export type QaCheckStatus = "passed" | "failed" | "skipped" | "blocked";

export type QaReportStatus = "passed" | "failed" | "blocked";

export type QaFailureReason =
  | "command_failed"
  | "command_timed_out"
  | "command_unavailable"
  | "unknown_error";

export interface QaCommand {
  id: "typescript" | "dashboard_integration_audit" | "intelligence_smoke_test";
  name: string;
  command: string;
  args: string[];
  blocking: boolean;
  timeoutMs: number;
  category: "tsc" | "audit" | "test";
}

export interface QaCommandResult {
  id: QaCommand["id"];
  name: string;
  command: string;
  status: QaCheckStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  blocking: boolean;
  reason?: QaFailureReason;
  summary: string;
}

export interface QaSchemaCheckResult {
  name?: string;
  status: QaCheckStatus;
  command?: string | null;
  summary: string;
  reason?: string;
}

export interface QaSchemaMessage {
  task_id?: string;
  tsc: QaSchemaCheckResult;
  tests: QaSchemaCheckResult[];
  audits: QaSchemaCheckResult[];
  warnings: string[];
  failures: string[];
}

export interface QaHarnessReport extends QaSchemaMessage {
  status: QaReportStatus;
  generatedAt: string;
  checks: QaCommandResult[];
}

export interface RunQaChecksOptions {
  commands?: QaCommand[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  taskId?: string;
}
