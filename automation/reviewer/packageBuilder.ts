import { promises as fs } from "fs";
import path from "path";
import { collectGitDiffSummary } from "./gitDiff";
import type { GitDiffSummary, ReviewPackageInput, ReviewPackageResult } from "./types";

const DEFAULT_REVIEW_OUTPUT_DIR = path.join(process.cwd(), "automation", "state", "data", "reviews");

function formatList(items: string[], emptyText: string): string {
  if (items.length === 0) {
    return `- ${emptyText}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function fenced(value: string, emptyText: string): string {
  const text = value.trim();
  return ["```text", text.length > 0 ? text : emptyText, "```"].join("\n");
}

function qaSummary(input: ReviewPackageInput): string {
  const qa = input.result.artifacts.qaReport;
  if (!qa) {
    return "- QA report unavailable.";
  }

  return [
    `- Status: ${qa.status}`,
    `- Generated At: ${qa.generatedAt}`,
    `- TypeScript: ${qa.tsc.status} - ${qa.tsc.summary}`,
    `- Test Checks: ${qa.tests.length}`,
    `- Audit Checks: ${qa.audits.length}`,
    `- Warnings: ${qa.warnings.length}`,
    `- Failures: ${qa.failures.length}`,
  ].join("\n");
}

function screenshotSummary(input: ReviewPackageInput): string {
  const screenshot = input.result.artifacts.screenshotReport;
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

function gitSummary(git: GitDiffSummary): string {
  return [
    "### git status --short",
    "",
    fenced(git.statusShort, "No status output."),
    "",
    "### git diff --stat",
    "",
    fenced(git.diffStat, "No tracked diff stat output."),
    "",
    "### git diff --name-only",
    "",
    formatList(git.changedFiles, "No tracked changed files reported by git diff --name-only."),
    "",
    "### Git Collection Errors",
    "",
    formatList(git.errors, "No git collection errors."),
  ].join("\n");
}

function buildReviewPackageMarkdown(input: ReviewPackageInput, git: GitDiffSummary): string {
  return [
    "# Automation Review Package",
    "",
    `Task: ${input.task.task_id}`,
    "",
    `Sprint: ${input.task.sprint}`,
    "",
    `Title: ${input.task.title}`,
    "",
    "## Task Summary",
    "",
    `Goal: ${input.task.goal}`,
    "",
    "### Scope",
    "",
    formatList(input.task.scope, "No scope entries."),
    "",
    "### Constraints",
    "",
    formatList(input.task.constraints, "No constraints listed."),
    "",
    "### Expected Output",
    "",
    formatList(input.task.expected_output, "No expected output listed."),
    "",
    "## Execution Summary",
    "",
    `- Started At: ${input.startedAt}`,
    `- Completed At: ${input.completedAt}`,
    `- Duration: ${input.durationMs}ms`,
    `- Final Pipeline Status: ${input.result.status}`,
    `- Failed Stage: ${input.result.failedStage ?? "none"}`,
    `- Summary File: ${input.summaryPath ?? "not written"}`,
    "",
    "## Files Changed",
    "",
    formatList(input.task.files, "Task did not declare file targets."),
    "",
    "## Git Diff Summary",
    "",
    gitSummary(git),
    "",
    "## QA Summary",
    "",
    qaSummary(input),
    "",
    "## Screenshot Summary",
    "",
    screenshotSummary(input),
    "",
    "## Warnings",
    "",
    formatList(input.result.warnings, "No warnings."),
    "",
    "## Failures",
    "",
    formatList(input.result.failures, "No failures."),
    "",
    "## Persisted Artifacts",
    "",
    formatList(input.result.persistedArtifacts, "No persisted artifacts reported."),
    "",
    "## Explicit Review Questions",
    "",
    "- Did the implementation stay within the declared sprint scope?",
    "- Were Dashboard and product runtime files untouched unless explicitly expected?",
    "- Did QA pass, or are failures clearly blocking?",
    "- Did screenshot capture pass, skip, or fail in an acceptable way for this sprint?",
    "- Are warnings non-blocking and documented?",
    "- Are there any merge blockers?",
    "",
    "## Prompt for ChatGPT Review",
    "",
    "Please review this QuantTerminal automation package. Focus on:",
    "",
    "- scope compliance",
    "- no Dashboard/product runtime changes unless expected",
    "- QA result",
    "- screenshot result",
    "- blocking issues",
    "- merge recommendation",
    "",
    "Return one of: PASS, PARTIAL PASS, or FAIL. If not PASS, list only the blocking or high-priority issues with concrete file references where possible.",
    "",
  ].join("\n");
}

export async function buildReviewPackage(input: ReviewPackageInput): Promise<ReviewPackageResult> {
  const outputDir = path.resolve(input.outputDir ?? DEFAULT_REVIEW_OUTPUT_DIR);
  await fs.mkdir(outputDir, { recursive: true });
  const git = await collectGitDiffSummary(input.cwd ?? process.cwd());
  const packagePath = path.join(outputDir, `${input.task.task_id}-review-package.md`);
  const markdown = buildReviewPackageMarkdown(input, git);
  await fs.writeFile(packagePath, markdown, "utf8");

  return {
    path: packagePath,
    git,
  };
}
