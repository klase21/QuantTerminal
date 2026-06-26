import { createAutomationContext, type CreateAutomationContextOptions } from "./context";
import { runQaChecks } from "../qa/runner";
import { captureDashboardScreenshots } from "../screenshot/capture";
import type {
  ApprovalMessage,
  AutomationContext,
  CodexStubOutput,
  PipelineArtifacts,
  PipelineResult,
  PipelineStage,
  PipelineStatus,
  QaMessage,
  ReviewMessage,
  ScreenshotMessage,
  StageResult,
  TaskMessage,
} from "./types";

function completeStage<TOutput>(
  context: AutomationContext,
  stage: PipelineStage,
  startedAt: string,
  output: TOutput,
  warnings: string[] = [],
): StageResult<TOutput> {
  return {
    stage,
    status: "passed",
    startedAt,
    completedAt: context.now(),
    output,
    warnings,
    errors: [],
    blocking: false,
  };
}

function failStage<TOutput>(
  context: AutomationContext,
  stage: PipelineStage,
  startedAt: string,
  errors: string[],
): StageResult<TOutput> {
  return {
    stage,
    status: "blocked",
    startedAt,
    completedAt: context.now(),
    warnings: [],
    errors,
    blocking: true,
  };
}

async function executePlanner(
  task: TaskMessage,
  context: AutomationContext,
): Promise<StageResult<TaskMessage>> {
  const startedAt = context.now();
  if (!task.task_id || !task.goal || !task.title) {
    return failStage(context, "planner", startedAt, [
      "Task message is missing required identity fields.",
    ]);
  }

  return completeStage(context, "planner", startedAt, task);
}

async function executeCodex(
  task: TaskMessage,
  context: AutomationContext,
): Promise<StageResult<CodexStubOutput>> {
  const startedAt = context.now();
  return completeStage(context, "codex", startedAt, {
    task_id: task.task_id,
    status: "stubbed",
    files: task.files,
    notes: [
      "Codex execution is stubbed in Sprint A3.",
      "No external agents, APIs, or product runtime paths are invoked.",
    ],
  });
}

async function executeQa(
  codexOutput: CodexStubOutput,
  context: AutomationContext,
): Promise<StageResult<QaMessage>> {
  const startedAt = context.now();
  const report = await runQaChecks({
    taskId: codexOutput.task_id,
  });
  const failed = report.status !== "passed";
  const blocking = failed && context.config.qaBlocking;
  const errors = blocking
    ? report.failures.length > 0
      ? report.failures
      : ["QA returned a blocking failure."]
    : [];
  const warnings = [
    ...report.warnings,
    ...(failed && !blocking ? ["QA returned non-blocking failures."] : []),
  ];

  return {
    stage: "qa",
    status: blocking ? "blocked" : failed ? "failed" : "passed",
    startedAt,
    completedAt: context.now(),
    output: report,
    warnings,
    errors,
    blocking,
  };
}

async function executeScreenshot(
  context: AutomationContext,
): Promise<StageResult<ScreenshotMessage>> {
  const startedAt = context.now();
  const report = await captureDashboardScreenshots();
  const failed = report.status === "failed" || report.status === "blocked";
  const blocking = failed && context.config.screenshotBlocking;
  const failureMessages = report.errors.map((error) => error.message);
  const warnings = failed && !blocking
    ? failureMessages.length > 0
      ? failureMessages
      : ["Screenshot returned a non-blocking failure."]
    : [];

  return {
    stage: "screenshot",
    status: blocking ? "blocked" : failed ? "failed" : "passed",
    startedAt,
    completedAt: context.now(),
    output: report,
    warnings,
    errors: blocking ? failureMessages : [],
    blocking,
  };
}

async function executeReview(
  task: TaskMessage,
  qa: QaMessage,
  screenshot: ScreenshotMessage,
  context: AutomationContext,
): Promise<StageResult<ReviewMessage>> {
  const startedAt = context.now();
  const hasQaFailures = qa.failures.length > 0;
  const hasScreenshotFailures = screenshot.errors.length > 0;
  const blockingIssues = hasQaFailures ? qa.failures : [];

  return completeStage(context, "review", startedAt, {
    review_id: `review-${task.task_id}`,
    task_id: task.task_id,
    architecture: {
      status: "passed",
      summary: "The orchestrator keeps automation isolated from product runtime paths.",
    },
    design: {
      status: "not_applicable",
      summary: "No UI or visual surface changed.",
    },
    runtime: {
      status: "passed",
      summary: "QA and screenshot harnesses run through explicit automation boundaries.",
    },
    screenshots: {
      status: hasScreenshotFailures ? "partial" : "skipped",
      summary: hasScreenshotFailures
        ? "Screenshot harness reported non-blocking issues."
        : "Screenshot capture completed without blocking issues.",
    },
    verdict: hasQaFailures ? "FAIL" : hasScreenshotFailures ? "PARTIAL PASS" : "PASS",
    blockingIssues,
    recommendations: [
      "Keep QA and screenshot blocking behavior explicit in pipeline configuration.",
    ],
  });
}

async function executeTelegramApproval(
  review: ReviewMessage,
  context: AutomationContext,
): Promise<StageResult<ApprovalMessage>> {
  const startedAt = context.now();
  const reviewId = review.review_id ?? "review-unavailable";
  return completeStage(context, "telegram_approval", startedAt, {
    review_id: reviewId,
    approved: false,
    reviewer: "stubbed-telegram-approval-agent",
    timestamp: context.now(),
    reason: "Telegram approval is stubbed in Sprint A3; no human approval was requested.",
  });
}

function collectResult<TOutput>(
  result: StageResult<TOutput>,
  completedStages: PipelineStage[],
  warnings: string[],
  errors: string[],
): boolean {
  warnings.push(...result.warnings);
  errors.push(...result.errors);

  if (result.blocking || result.status === "blocked") {
    return false;
  }

  completedStages.push(result.stage);
  return true;
}

function pipelineStatusForFailure(failedStage: PipelineStage | null): PipelineStatus {
  return failedStage ? "blocked" : "completed";
}

function buildPipelineState(input: {
  task: TaskMessage;
  status: PipelineStatus;
  currentStage: PipelineStage | null;
  completedStages: PipelineStage[];
  warnings: string[];
  failures: string[];
  artifacts: PipelineArtifacts;
  updatedAt: string;
}) {
  return {
    taskId: input.task.task_id,
    status: input.status,
    currentStage: input.currentStage,
    completedStages: input.completedStages,
    warnings: input.warnings,
    failures: input.failures,
    updatedAt: input.updatedAt,
    artifacts: input.artifacts,
  };
}

export async function runPipeline(
  task: TaskMessage,
  options: CreateAutomationContextOptions = {},
): Promise<PipelineResult> {
  const context = createAutomationContext(options);
  const artifacts: PipelineArtifacts = {};
  const completedStages: PipelineStage[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const persistedArtifacts: string[] = [];
  let currentStage: PipelineStage | null = null;
  let failedStage: PipelineStage | null = null;

  const persistPipelineState = async (status: PipelineStatus = pipelineStatusForFailure(failedStage)) => {
    await context.stateManager.savePipelineState(buildPipelineState({
      task,
      status,
      currentStage,
      completedStages,
      warnings,
      failures: errors,
      artifacts,
      updatedAt: context.now(),
    }));
    if (!persistedArtifacts.includes("pipeline")) {
      persistedArtifacts.push("pipeline");
    }
    context.logger.info(`STATE pipeline persisted for ${task.task_id}`);
  };

  const persistAndReturn = async (status: PipelineStatus): Promise<PipelineResult> => {
    await persistPipelineState(status);
    return {
      status,
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
      failures: errors,
      persistedArtifacts,
    };
  };

  const existingTask = await context.stateManager.loadTask(task.task_id);
  if (!existingTask) {
    await context.stateManager.createTask({
      taskId: task.task_id,
      sprint: task.sprint,
      title: task.title,
      goal: task.goal,
      status: "NEW",
    });
    persistedArtifacts.push("task");
    context.logger.info(`STATE task created for ${task.task_id}`);
  }

  await context.stateManager.updateTask(task.task_id, {
    sprint: task.sprint,
    title: task.title,
    goal: task.goal,
    status: "RUNNING",
    currentStage: "codex",
  });
  context.logger.info(`STATE task ${task.task_id} -> RUNNING`);
  await persistPipelineState("blocked");

  const runStage = async <TOutput>(
    stage: PipelineStage,
    execute: () => Promise<StageResult<TOutput>>,
  ): Promise<StageResult<TOutput> | null> => {
    currentStage = stage;
    context.logger.stageStart(stage);

    try {
      const result = await execute();
      context.logger.stageEnd(stage, result.status);
      for (const warning of result.warnings) {
        context.logger.info(`WARN ${stage} ${warning}`);
      }
      const canContinue = collectResult(result, completedStages, warnings, errors);
      if (!canContinue) {
        failedStage = stage;
        context.logger.stageFailure(stage, result.errors);
      }
      return result;
    } catch (error) {
      failedStage = stage;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      context.logger.stageFailure(stage, [message]);
      return null;
    }
  };

  const plannerResult = await runStage("planner", () => executePlanner(task, context));
  if (!plannerResult?.output) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }
  artifacts.planner = plannerResult.output;
  if (failedStage) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }

  const codexResult = await runStage("codex", () => executeCodex(plannerResult.output, context));
  if (!codexResult?.output) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }
  artifacts.codex = codexResult.output;
  if (failedStage) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }

  await context.stateManager.updateTask(task.task_id, {
    status: "QA",
    currentStage: "qa",
  });
  context.logger.info(`STATE task ${task.task_id} -> QA`);
  await persistPipelineState("blocked");

  const qaResult = await runStage("qa", () =>
    executeQa(codexResult.output, context),
  );
  if (!qaResult?.output) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }
  artifacts.qa = qaResult.output;
  artifacts.qaReport = qaResult.output;
  await context.stateManager.saveQaReport({
    taskId: task.task_id,
    generatedAt: context.now(),
    report: qaResult.output,
  });
  persistedArtifacts.push("qaReport");
  context.logger.info(`STATE QA report persisted for ${task.task_id}`);
  if (failedStage) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }

  await context.stateManager.updateTask(task.task_id, {
    status: "SCREENSHOT",
    currentStage: "screenshot",
  });
  context.logger.info(`STATE task ${task.task_id} -> SCREENSHOT`);
  await persistPipelineState("blocked");

  const screenshotResult = await runStage("screenshot", () =>
    executeScreenshot(context),
  );
  if (!screenshotResult?.output) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }
  artifacts.screenshot = screenshotResult.output;
  artifacts.screenshotReport = screenshotResult.output;
  await context.stateManager.saveScreenshotReport({
    taskId: task.task_id,
    generatedAt: context.now(),
    report: screenshotResult.output,
  });
  persistedArtifacts.push("screenshotReport");
  context.logger.info(`STATE screenshot report persisted for ${task.task_id}`);
  if (failedStage) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }

  await context.stateManager.updateTask(task.task_id, {
    status: "REVIEW",
    currentStage: "review",
  });
  context.logger.info(`STATE task ${task.task_id} -> REVIEW`);
  await persistPipelineState("blocked");

  const reviewResult = await runStage("review", () =>
    executeReview(plannerResult.output, qaResult.output, screenshotResult.output, context),
  );
  if (!reviewResult?.output) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }
  artifacts.review = reviewResult.output;
  await context.stateManager.saveReview({
    taskId: task.task_id,
    generatedAt: context.now(),
    review: reviewResult.output,
  });
  persistedArtifacts.push("review");
  context.logger.info(`STATE review persisted for ${task.task_id}`);
  if (failedStage) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }

  await context.stateManager.updateTask(task.task_id, {
    status: "WAITING_APPROVAL",
    currentStage: "telegram_approval",
  });
  context.logger.info(`STATE task ${task.task_id} -> WAITING_APPROVAL`);
  await persistPipelineState("blocked");

  const approvalResult = await runStage("telegram_approval", () =>
    executeTelegramApproval(reviewResult.output, context),
  );
  if (!approvalResult?.output) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }
  artifacts.telegram_approval = approvalResult.output;
  await context.stateManager.saveApproval({
    taskId: task.task_id,
    generatedAt: context.now(),
    approval: approvalResult.output,
  });
  persistedArtifacts.push("approval");
  context.logger.info(`STATE approval persisted for ${task.task_id}`);
  if (failedStage) {
    await context.stateManager.updateTask(task.task_id, {
      status: "FAILED",
      currentStage,
    });
    context.logger.info(`STATE task ${task.task_id} -> FAILED`);
    return persistAndReturn("blocked");
  }

  await context.stateManager.saveResult({
    taskId: task.task_id,
    generatedAt: context.now(),
    pipeline: buildPipelineState({
      task,
      status: "completed",
      currentStage,
      completedStages,
      warnings,
      failures: errors,
      artifacts,
      updatedAt: context.now(),
    }),
  });
  persistedArtifacts.push("result");
  context.logger.info(`STATE result persisted for ${task.task_id}`);

  return persistAndReturn("completed");
}
