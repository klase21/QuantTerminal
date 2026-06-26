import type { PipelineStage } from "../orchestrator/types";
import type { AutomationTaskStatus } from "./types";

export const ACTIVE_AUTOMATION_STATUSES: AutomationTaskStatus[] = [
  "NEW",
  "PLANNED",
  "RUNNING",
  "QA",
  "SCREENSHOT",
  "REVIEW",
  "WAITING_APPROVAL",
  "APPROVED",
  "MERGED",
];

export const TERMINAL_AUTOMATION_STATUSES: AutomationTaskStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const FORWARD_TRANSITIONS: Record<AutomationTaskStatus, AutomationTaskStatus[]> = {
  NEW: ["PLANNED", "RUNNING", "FAILED", "CANCELLED"],
  PLANNED: ["RUNNING", "FAILED", "CANCELLED"],
  RUNNING: ["QA", "FAILED", "CANCELLED"],
  QA: ["SCREENSHOT", "FAILED", "CANCELLED"],
  SCREENSHOT: ["REVIEW", "FAILED", "CANCELLED"],
  REVIEW: ["WAITING_APPROVAL", "FAILED", "CANCELLED"],
  WAITING_APPROVAL: ["APPROVED", "FAILED", "CANCELLED"],
  APPROVED: ["MERGED", "FAILED", "CANCELLED"],
  MERGED: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionTask(
  from: AutomationTaskStatus,
  to: AutomationTaskStatus,
): boolean {
  if (from === to) {
    return true;
  }

  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTaskTransition(
  from: AutomationTaskStatus,
  to: AutomationTaskStatus,
): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Invalid automation task transition: ${from} -> ${to}`);
  }
}

export function statusToPipelineStage(status: AutomationTaskStatus): PipelineStage | null {
  switch (status) {
    case "PLANNED":
      return "planner";
    case "RUNNING":
      return "codex";
    case "QA":
      return "qa";
    case "SCREENSHOT":
      return "screenshot";
    case "REVIEW":
      return "review";
    case "WAITING_APPROVAL":
    case "APPROVED":
      return "telegram_approval";
    default:
      return null;
  }
}

export function isTerminalAutomationStatus(status: AutomationTaskStatus): boolean {
  return TERMINAL_AUTOMATION_STATUSES.includes(status);
}
