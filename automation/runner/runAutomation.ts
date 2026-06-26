import { fileURLToPath } from "url";
import path from "path";
import { runPipeline } from "../orchestrator";
import { buildReviewPackage } from "../reviewer/packageBuilder";
import { createAutomationStateManager } from "../state/manager";
import { JsonAutomationRepository } from "../state/repository";
import { parseRunnerArgs } from "./cli";
import { loadRunnerConfig, resolvePipelineConfig, resolveSummaryOutputDir } from "./config";
import { writeExecutionSummary } from "./reportWriter";
import { loadTask } from "./taskLoader";
import type { ExecutionPlan, RunnerCliOptions, RunnerResult } from "./types";

const PIPELINE_STAGES = [
  "planner",
  "codex",
  "qa",
  "screenshot",
  "review",
  "telegram_approval",
];

function buildExecutionPlan(input: {
  taskId: string;
  sprint: string;
  title: string;
  config: ReturnType<typeof resolvePipelineConfig>;
  summaryOutputDir: string;
}): ExecutionPlan {
  return {
    taskId: input.taskId,
    sprint: input.sprint,
    title: input.title,
    stages: PIPELINE_STAGES,
    config: input.config,
    summaryOutputDir: input.summaryOutputDir,
  };
}

function printPlan(plan: ExecutionPlan): void {
  console.log("Automation execution plan");
  console.log(`Task: ${plan.taskId}`);
  console.log(`Sprint: ${plan.sprint}`);
  console.log(`Title: ${plan.title}`);
  console.log(`Stages: ${plan.stages.join(" -> ")}`);
  console.log(`QA blocking: ${plan.config.qaBlocking}`);
  console.log(`Screenshot blocking: ${plan.config.screenshotBlocking}`);
  console.log(`Summary output: ${plan.summaryOutputDir}`);
}

export async function runAutomation(options: RunnerCliOptions): Promise<RunnerResult> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const loadedTask = await loadTask(options.taskPath);
  const runnerConfig = await loadRunnerConfig(options.configPath);
  const pipelineConfig = resolvePipelineConfig(runnerConfig);
  const summaryOutputDir = resolveSummaryOutputDir(runnerConfig);
  const plan = buildExecutionPlan({
    taskId: loadedTask.task.task_id,
    sprint: loadedTask.task.sprint,
    title: loadedTask.task.title,
    config: pipelineConfig,
    summaryOutputDir,
  });

  if (options.dryRun) {
    if (options.verbose) {
      console.log(`Loaded task from ${loadedTask.path}`);
    }
    printPlan(plan);
    const completedAt = new Date().toISOString();
    return {
      task: loadedTask.task,
      dryRun: true,
      startedAt,
      completedAt,
      durationMs: Date.now() - startedMs,
      plan,
    };
  }

  const stateManager = createAutomationStateManager({
    repository: runnerConfig.stateRoot
      ? new JsonAutomationRepository(runnerConfig.stateRoot)
      : undefined,
  });
  const pipelineResult = await runPipeline(loadedTask.task, {
    config: pipelineConfig,
    stateManager,
  });
  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startedMs;
  const summaryPath = await writeExecutionSummary({
    task: loadedTask.task,
    result: pipelineResult,
    startedAt,
    completedAt,
    durationMs,
    outputDir: summaryOutputDir,
  });
  const reviewPackage = await buildReviewPackage({
    task: loadedTask.task,
    result: pipelineResult,
    startedAt,
    completedAt,
    durationMs,
    summaryPath,
  });

  if (options.verbose) {
    console.log(`Loaded task from ${loadedTask.path}`);
    console.log(`Summary written to ${summaryPath}`);
    console.log(`Review package written to ${reviewPackage.path}`);
  }

  console.log(`Automation status: ${pipelineResult.status}`);
  console.log(`Completed stages: ${pipelineResult.completedStages.join(", ") || "none"}`);
  console.log(`Failed stage: ${pipelineResult.failedStage ?? "none"}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`Review package: ${reviewPackage.path}`);

  return {
    task: loadedTask.task,
    dryRun: false,
    startedAt,
    completedAt,
    durationMs,
    plan,
    pipelineResult,
    summaryPath,
    reviewPackagePath: reviewPackage.path,
  };
}

async function main(): Promise<void> {
  try {
    const options = parseRunnerArgs(process.argv.slice(2));
    await runAutomation(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (path.resolve(currentFile) === entryFile) {
  void main();
}
