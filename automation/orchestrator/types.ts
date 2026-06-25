import approvalSchema from "../contracts/approval.schema.json";
import qaSchema from "../contracts/qa.schema.json";
import reviewSchema from "../contracts/review.schema.json";
import screenshotSchema from "../contracts/screenshot.schema.json";
import taskSchema from "../contracts/task.schema.json";

export const automationSchemas = {
  task: taskSchema,
  qa: qaSchema,
  screenshot: screenshotSchema,
  review: reviewSchema,
  approval: approvalSchema,
} as const;

export type PipelineStage =
  | "planner"
  | "codex"
  | "qa"
  | "screenshot"
  | "review"
  | "telegram_approval";

export type StageStatus = "passed" | "failed" | "skipped" | "blocked";

export type PipelineStatus = "completed" | "failed" | "blocked";

export interface TaskMessage {
  task_id: string;
  sprint: string;
  title: string;
  goal: string;
  scope: string[];
  constraints: string[];
  files: string[];
  validation: string[];
  expected_output: string[];
}

export interface CheckResult {
  name?: string;
  status: StageStatus;
  command?: string | null;
  summary: string;
  reason?: string;
}

export interface QaMessage {
  task_id?: string;
  tsc: CheckResult;
  tests: CheckResult[];
  audits: CheckResult[];
  warnings: string[];
  failures: string[];
}

export interface ScreenshotCapture {
  status: StageStatus;
  path?: string;
  notes?: string[];
}

export interface ScreenshotMessage {
  task_id?: string;
  timestamp: string;
  status: StageStatus;
  viewport: {
    desktop: string;
    tablet: string;
    mobile: string;
  };
  desktop: ScreenshotCapture;
  tablet: ScreenshotCapture;
  mobile: ScreenshotCapture;
}

export interface ReviewSection {
  status: "passed" | "partial" | "failed" | "skipped" | "not_applicable";
  summary: string;
  issues?: string[];
}

export interface ReviewMessage {
  review_id?: string;
  task_id?: string;
  architecture: ReviewSection;
  design: ReviewSection;
  runtime: ReviewSection;
  screenshots: ReviewSection;
  verdict: "PASS" | "PARTIAL PASS" | "FAIL";
  blockingIssues: string[];
  recommendations: string[];
}

export interface ApprovalMessage {
  review_id: string;
  approved: boolean;
  reviewer: string;
  timestamp: string;
  reason?: string;
}

export interface CodexStubOutput {
  task_id: string;
  status: "stubbed";
  files: string[];
  notes: string[];
}

export interface StageResult<TOutput> {
  stage: PipelineStage;
  status: StageStatus;
  startedAt: string;
  completedAt: string;
  output?: TOutput;
  warnings: string[];
  errors: string[];
  blocking: boolean;
}

export interface PipelineArtifacts {
  planner?: TaskMessage;
  codex?: CodexStubOutput;
  qa?: QaMessage;
  screenshot?: ScreenshotMessage;
  review?: ReviewMessage;
  telegram_approval?: ApprovalMessage;
}

export interface PipelineResult {
  status: PipelineStatus;
  currentStage: PipelineStage | null;
  completedStages: PipelineStage[];
  failedStage: PipelineStage | null;
  artifacts: PipelineArtifacts;
  warnings: string[];
  errors: string[];
}

export interface StageExecutor<TInput, TOutput> {
  stage: PipelineStage;
  execute(input: TInput, context: AutomationContext): Promise<StageResult<TOutput>>;
}

export interface AutomationLogger {
  stageStart(stage: PipelineStage): void;
  stageEnd(stage: PipelineStage, status: StageStatus): void;
  stageFailure(stage: PipelineStage, errors: string[]): void;
  info(message: string): void;
}

export interface AutomationContext {
  logger: AutomationLogger;
  schemas: typeof automationSchemas;
  now(): string;
}
