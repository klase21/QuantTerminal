import type { QaCommand } from "./types";

const ONE_MINUTE_MS = 60_000;

export const TYPESCRIPT_QA_COMMAND: QaCommand = {
  id: "typescript",
  name: "TypeScript",
  command: "npx.cmd",
  args: ["tsc", "--noEmit", "--pretty", "false", "--incremental", "false"],
  blocking: true,
  timeoutMs: 3 * ONE_MINUTE_MS,
  category: "tsc",
};

export const DASHBOARD_INTEGRATION_AUDIT_COMMAND: QaCommand = {
  id: "dashboard_integration_audit",
  name: "Dashboard Integration Audit",
  command: "npm",
  args: ["run", "audit:dashboard-integration"],
  blocking: false,
  timeoutMs: 2 * ONE_MINUTE_MS,
  category: "audit",
};

export const INTELLIGENCE_SMOKE_TEST_COMMAND: QaCommand = {
  id: "intelligence_smoke_test",
  name: "Intelligence Smoke Test",
  command: "npm",
  args: ["run", "test:intelligence"],
  blocking: false,
  timeoutMs: 2 * ONE_MINUTE_MS,
  category: "test",
};

export const STANDARD_QA_COMMANDS: QaCommand[] = [
  TYPESCRIPT_QA_COMMAND,
  DASHBOARD_INTEGRATION_AUDIT_COMMAND,
  INTELLIGENCE_SMOKE_TEST_COMMAND,
];

export function formatCommand(command: QaCommand): string {
  return [command.command, ...command.args].join(" ");
}
