import { createAutomationContext, type CreateAutomationContextOptions } from "./context";
import type {
  ApprovalMessage,
  AutomationContext,
  CodexStubOutput,
  PipelineArtifacts,
  PipelineResult,
  PipelineStage,
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
  task: TaskMessage,
  context: AutomationContext,
): Promise<StageResult<QaMessage>> {
  const startedAt = context.now();
  return completeStage(context, "qa", startedAt, {
    task_id: codexOutput.task_id,
    tsc: {
      status: "skipped",
      command: null,
      summary: "QA execution is stubbed in Sprint A3.",
      reason: "The orchestrator does not run validation commands yet.",
    },
    tests: [],
    audits: [
      {
        name: "task contract awareness",
        status: "passed",
        summary: `Task references ${task.files.length} file path(s).`,
      },
    ],
    warnings: ["QA validation is stubbed behind an interface."],
    failures: [],
  });
}

async function executeScreenshot(
  task: TaskMessage,
  context: AutomationContext,
): Promise<StageResult<ScreenshotMessage>> {
  const startedAt = context.now();
  return completeStage(context, "screenshot", startedAt, {
    task_id: task.task_id,
    timestamp: context.now(),
    status: "skipped",
    viewport: {
      desktop: "1440x1024",
      tablet: "1024x768",
      mobile: "390x844",
    },
    desktop: {
      status: "skipped",
      notes: ["Screenshot capture is stubbed in Sprint A3."],
    },
    tablet: {
      status: "skipped",
      notes: ["Screenshot capture is stubbed in Sprint A3."],
    },
    mobile: {
      status: "skipped",
      notes: ["Screenshot capture is stubbed in Sprint A3."],
    },
  });
}

async function executeReview(
  task: TaskMessage,
  qa: QaMessage,
  screenshot: ScreenshotMessage,
  context: AutomationContext,
): Promise<StageResult<ReviewMessage>> {
  const startedAt = context.now();
  const hasFailures = qa.failures.length > 0;
  const blockingIssues = hasFailures ? qa.failures : [];

  return completeStage(context, "review", startedAt, {
    review_id: `review-${task.task_id}`,
    task_id: task.task_id,
    architecture: {
      status: "passed",
      summary: "A3 creates an isolated orchestrator layer with stubbed integrations.",
    },
    design: {
      status: "not_applicable",
      summary: "No UI or visual surface changed.",
    },
    runtime: {
      status: "passed",
      summary: "Product runtime paths are not invoked by the stub pipeline.",
    },
    screenshots: {
      status: screenshot.status === "failed" ? "failed" : "skipped",
      summary: "Screenshot capture is stubbed in Sprint A3.",
    },
    verdict: hasFailures ? "FAIL" : "PASS",
    blockingIssues,
    recommendations: [
      "Replace each stub executor with a real adapter only after an explicit future sprint.",
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

  if (result.blocking || result.status === "failed" || result.status === "blocked") {
    return false;
  }

  completedStages.push(result.stage);
  return true;
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
  let currentStage: PipelineStage | null = null;
  let failedStage: PipelineStage | null = null;

  const runStage = async <TOutput>(
    stage: PipelineStage,
    execute: () => Promise<StageResult<TOutput>>,
  ): Promise<StageResult<TOutput> | null> => {
    currentStage = stage;
    context.logger.stageStart(stage);

    try {
      const result = await execute();
      context.logger.stageEnd(stage, result.status);
      const canContinue = collectResult(result, completedStages, warnings, errors);
      if (!canContinue) {
        failedStage = stage;
        context.logger.stageFailure(stage, result.errors);
        return null;
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
    return {
      status: "blocked",
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
    };
  }
  artifacts.planner = plannerResult.output;

  const codexResult = await runStage("codex", () => executeCodex(plannerResult.output, context));
  if (!codexResult?.output) {
    return {
      status: "blocked",
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
    };
  }
  artifacts.codex = codexResult.output;

  const qaResult = await runStage("qa", () =>
    executeQa(codexResult.output, plannerResult.output, context),
  );
  if (!qaResult?.output) {
    return {
      status: "blocked",
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
    };
  }
  artifacts.qa = qaResult.output;

  const screenshotResult = await runStage("screenshot", () =>
    executeScreenshot(plannerResult.output, context),
  );
  if (!screenshotResult?.output) {
    return {
      status: "blocked",
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
    };
  }
  artifacts.screenshot = screenshotResult.output;

  const reviewResult = await runStage("review", () =>
    executeReview(plannerResult.output, qaResult.output, screenshotResult.output, context),
  );
  if (!reviewResult?.output) {
    return {
      status: "blocked",
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
    };
  }
  artifacts.review = reviewResult.output;

  const approvalResult = await runStage("telegram_approval", () =>
    executeTelegramApproval(reviewResult.output, context),
  );
  if (!approvalResult?.output) {
    return {
      status: "blocked",
      currentStage,
      completedStages,
      failedStage,
      artifacts,
      warnings,
      errors,
    };
  }
  artifacts.telegram_approval = approvalResult.output;

  return {
    status: "completed",
    currentStage,
    completedStages,
    failedStage,
    artifacts,
    warnings,
    errors,
  };
}
