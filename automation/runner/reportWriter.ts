import { promises as fs } from "fs";
import path from "path";
import type { PipelineResult, TaskMessage } from "../orchestrator/types";

function formatList(items: string[], emptyText: string): string {
  if (items.length === 0) {
    return `- ${emptyText}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function qaSummary(result: PipelineResult): string {
  const qa = result.artifacts.qaReport;
  if (!qa) {
    return "- QA report unavailable.";
  }

  return [
    `- Status: ${qa.status}`,
    `- Generated At: ${qa.generatedAt}`,
    `- TypeScript: ${qa.tsc.status} - ${qa.tsc.summary}`,
    `- Tests: ${qa.tests.length}`,
    `- Audits: ${qa.audits.length}`,
    `- Warnings: ${qa.warnings.length}`,
    `- Failures: ${qa.failures.length}`,
  ].join("\n");
}

function screenshotSummary(result: PipelineResult): string {
  const screenshot = result.artifacts.screenshotReport;
  if (!screenshot) {
    return "- Screenshot report unavailable.";
  }

  return [
    `- Status: ${screenshot.status}`,
    `- Timestamp: ${screenshot.timestamp}`,
    `- Desktop: ${screenshot.desktop.status}`,
    `- Laptop: ${screenshot.laptop.status}`,
    `- Tablet: ${screenshot.tablet.status}`,
    `- Mobile: ${screenshot.mobile.status}`,
    `- Errors: ${screenshot.errors.length}`,
  ].join("\n");
}

export async function writeExecutionSummary(input: {
  task: TaskMessage;
  result: PipelineResult;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  outputDir: string;
}): Promise<string> {
  await fs.mkdir(input.outputDir, { recursive: true });
  const summaryPath = path.join(input.outputDir, `${input.task.task_id}-summary.md`);
  const content = [
    `# Automation Execution Summary`,
    "",
    `Task: ${input.task.task_id}`,
    "",
    `Sprint: ${input.task.sprint}`,
    "",
    `Title: ${input.task.title}`,
    "",
    `## Execution`,
    "",
    `- Started At: ${input.startedAt}`,
    `- Completed At: ${input.completedAt}`,
    `- Duration: ${input.durationMs}ms`,
    `- Final Status: ${input.result.status}`,
    `- Failed Stage: ${input.result.failedStage ?? "none"}`,
    "",
    `## Completed Stages`,
    "",
    formatList(input.result.completedStages, "No stages completed."),
    "",
    `## QA Summary`,
    "",
    qaSummary(input.result),
    "",
    `## Screenshot Summary`,
    "",
    screenshotSummary(input.result),
    "",
    `## Warnings`,
    "",
    formatList(input.result.warnings, "No warnings."),
    "",
    `## Failures`,
    "",
    formatList(input.result.failures, "No failures."),
    "",
    `## Persisted Artifacts`,
    "",
    formatList(input.result.persistedArtifacts, "No artifacts persisted."),
    "",
  ].join("\n");

  await fs.writeFile(summaryPath, content, "utf8");
  return summaryPath;
}
