import type { PipelineResult, TaskMessage } from "../orchestrator/types";

export interface GitDiffSummary {
  statusShort: string;
  diffStat: string;
  changedFiles: string[];
  errors: string[];
}

export interface ReviewPackageInput {
  task: TaskMessage;
  result: PipelineResult;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  summaryPath?: string;
  outputDir?: string;
  cwd?: string;
}

export interface ReviewPackageResult {
  path: string;
  git: GitDiffSummary;
}
