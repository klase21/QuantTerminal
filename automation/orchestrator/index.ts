export { createAutomationContext } from "./context";
export { ConsoleAutomationLogger, SilentAutomationLogger } from "./logger";
export { runPipeline } from "./pipeline";
export type {
  ApprovalMessage,
  AutomationContext,
  AutomationLogger,
  CheckResult,
  CodexStubOutput,
  PipelineArtifacts,
  PipelineResult,
  PipelineStage,
  PipelineStatus,
  QaMessage,
  ReviewMessage,
  ReviewSection,
  ScreenshotCapture,
  ScreenshotMessage,
  StageExecutor,
  StageResult,
  StageStatus,
  TaskMessage,
} from "./types";
export { automationSchemas } from "./types";
