import type {
  ApprovalMessage,
  PipelineArtifacts,
  PipelineStage,
  PipelineStatus,
  ReviewMessage,
} from "../orchestrator/types";
import type { QaHarnessReport } from "../qa/types";
import type { DashboardScreenshotResult } from "../screenshot/types";

export type AutomationTaskStatus =
  | "NEW"
  | "PLANNED"
  | "RUNNING"
  | "QA"
  | "SCREENSHOT"
  | "REVIEW"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "MERGED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface AutomationTaskRecord {
  taskId: string;
  sprint: string;
  status: AutomationTaskStatus;
  createdAt: string;
  updatedAt: string;
  currentStage: PipelineStage | null;
  title?: string;
  goal?: string;
  archivedAt?: string;
}

export interface CreateTaskInput {
  taskId: string;
  sprint: string;
  title?: string;
  goal?: string;
  status?: AutomationTaskStatus;
  currentStage?: PipelineStage | null;
}

export interface UpdateTaskInput {
  sprint?: string;
  title?: string;
  goal?: string;
  status?: AutomationTaskStatus;
  currentStage?: PipelineStage | null;
  archivedAt?: string;
}

export interface AutomationPipelineState {
  taskId: string;
  status: PipelineStatus | "not_started";
  currentStage: PipelineStage | null;
  completedStages: PipelineStage[];
  warnings: string[];
  failures: string[];
  updatedAt: string;
  artifacts?: PipelineArtifacts;
}

export interface AutomationResultRecord {
  taskId: string;
  generatedAt: string;
  pipeline: AutomationPipelineState;
}

export interface AutomationReviewRecord {
  taskId: string;
  generatedAt: string;
  review: ReviewMessage;
}

export interface AutomationApprovalRecord {
  taskId: string;
  generatedAt: string;
  approval: ApprovalMessage;
}

export interface AutomationQaRecord {
  taskId: string;
  generatedAt: string;
  report: QaHarnessReport;
}

export interface AutomationScreenshotRecord {
  taskId: string;
  generatedAt: string;
  report: DashboardScreenshotResult;
}

export interface AutomationStatePaths {
  root: string;
  tasks: string;
  results: string;
  reviews: string;
  approvals: string;
  pipeline: string;
}

export interface AutomationRepository {
  saveTask(task: AutomationTaskRecord): Promise<void>;
  loadTask(taskId: string): Promise<AutomationTaskRecord | null>;
  listTasks(): Promise<AutomationTaskRecord[]>;
  savePipelineState(state: AutomationPipelineState): Promise<void>;
  loadPipelineState(taskId: string): Promise<AutomationPipelineState | null>;
  saveResult(result: AutomationResultRecord): Promise<void>;
  saveReview(review: AutomationReviewRecord): Promise<void>;
  saveApproval(approval: AutomationApprovalRecord): Promise<void>;
}
