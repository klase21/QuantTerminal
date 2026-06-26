import { promises as fs } from "fs";
import path from "path";
import type {
  AutomationApprovalRecord,
  AutomationPipelineState,
  AutomationQaRecord,
  AutomationRepository,
  AutomationResultRecord,
  AutomationReviewRecord,
  AutomationScreenshotRecord,
  AutomationStatePaths,
  AutomationTaskRecord,
} from "./types";

const DEFAULT_STATE_ROOT = path.join(process.cwd(), "automation", "state", "data");

function safeFileName(id: string): string {
  return `${id.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text) as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = String((error as { code?: unknown }).code ?? "");
      if (code === "ENOENT") {
        return null;
      }
    }
    throw error;
  }
}

export function createAutomationStatePaths(root: string = DEFAULT_STATE_ROOT): AutomationStatePaths {
  return {
    root,
    tasks: path.join(root, "tasks"),
    results: path.join(root, "results"),
    reviews: path.join(root, "reviews"),
    approvals: path.join(root, "approvals"),
    pipeline: path.join(root, "pipeline"),
  };
}

export class JsonAutomationRepository implements AutomationRepository {
  readonly paths: AutomationStatePaths;

  constructor(root?: string) {
    this.paths = createAutomationStatePaths(root);
  }

  async saveTask(task: AutomationTaskRecord): Promise<void> {
    await writeJson(this.taskPath(task.taskId), task);
  }

  async loadTask(taskId: string): Promise<AutomationTaskRecord | null> {
    return readJson<AutomationTaskRecord>(this.taskPath(taskId));
  }

  async listTasks(): Promise<AutomationTaskRecord[]> {
    await ensureDir(this.paths.tasks);
    const entries = await fs.readdir(this.paths.tasks, { withFileTypes: true });
    const tasks: AutomationTaskRecord[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const task = await readJson<AutomationTaskRecord>(path.join(this.paths.tasks, entry.name));
      if (task) {
        tasks.push(task);
      }
    }

    return tasks.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async savePipelineState(state: AutomationPipelineState): Promise<void> {
    await writeJson(this.pipelinePath(state.taskId), state);
  }

  async loadPipelineState(taskId: string): Promise<AutomationPipelineState | null> {
    return readJson<AutomationPipelineState>(this.pipelinePath(taskId));
  }

  async saveResult(result: AutomationResultRecord): Promise<void> {
    await writeJson(this.resultPath(result.taskId), result);
  }

  async saveQaReport(report: AutomationQaRecord): Promise<void> {
    await writeJson(this.resultPath(report.taskId, "qa"), report);
  }

  async saveScreenshotReport(report: AutomationScreenshotRecord): Promise<void> {
    await writeJson(this.resultPath(report.taskId, "screenshot"), report);
  }

  async saveReview(review: AutomationReviewRecord): Promise<void> {
    await writeJson(this.reviewPath(review.taskId), review);
  }

  async saveApproval(approval: AutomationApprovalRecord): Promise<void> {
    await writeJson(this.approvalPath(approval.taskId), approval);
  }

  private taskPath(taskId: string): string {
    return path.join(this.paths.tasks, safeFileName(taskId));
  }

  private pipelinePath(taskId: string): string {
    return path.join(this.paths.pipeline, safeFileName(taskId));
  }

  private resultPath(taskId: string, kind?: string): string {
    const id = kind ? `${taskId}.${kind}` : taskId;
    return path.join(this.paths.results, safeFileName(id));
  }

  private reviewPath(taskId: string): string {
    return path.join(this.paths.reviews, safeFileName(taskId));
  }

  private approvalPath(taskId: string): string {
    return path.join(this.paths.approvals, safeFileName(taskId));
  }
}
