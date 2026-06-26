import type { PipelineConfig, PipelineResult, TaskMessage } from "../orchestrator/types";

export interface RunnerCliOptions {
  taskPath: string;
  configPath?: string;
  dryRun: boolean;
  verbose: boolean;
}

export interface RunnerConfig {
  qaBlocking?: boolean;
  screenshotBlocking?: boolean;
  stateRoot?: string;
  summaryOutputDir?: string;
}

export interface LoadedTask {
  task: TaskMessage;
  path: string;
}

export interface ExecutionPlan {
  taskId: string;
  sprint: string;
  title: string;
  stages: string[];
  config: PipelineConfig;
  summaryOutputDir: string;
}

export interface RunnerResult {
  task: TaskMessage;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  plan: ExecutionPlan;
  pipelineResult?: PipelineResult;
  summaryPath?: string;
}
