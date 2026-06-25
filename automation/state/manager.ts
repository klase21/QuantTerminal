import { assertTaskTransition, statusToPipelineStage } from "./lifecycle";
import { JsonAutomationRepository } from "./repository";
import type {
  AutomationPipelineState,
  AutomationRepository,
  AutomationTaskRecord,
  CreateTaskInput,
  UpdateTaskInput,
} from "./types";

export interface AutomationStateManagerOptions {
  repository?: AutomationRepository;
  now?: () => string;
}

export interface AutomationStateManager {
  createTask(input: CreateTaskInput): Promise<AutomationTaskRecord>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<AutomationTaskRecord>;
  loadTask(taskId: string): Promise<AutomationTaskRecord | null>;
  listTasks(): Promise<AutomationTaskRecord[]>;
  archiveTask(taskId: string): Promise<AutomationTaskRecord>;
  savePipelineState(state: AutomationPipelineState): Promise<void>;
  loadPipelineState(taskId: string): Promise<AutomationPipelineState | null>;
}

export function createAutomationStateManager(
  options: AutomationStateManagerOptions = {},
): AutomationStateManager {
  const repository = options.repository ?? new JsonAutomationRepository();
  const now = options.now ?? (() => new Date().toISOString());

  return {
    async createTask(input: CreateTaskInput): Promise<AutomationTaskRecord> {
      const existing = await repository.loadTask(input.taskId);
      if (existing) {
        throw new Error(`Automation task already exists: ${input.taskId}`);
      }

      const timestamp = now();
      const status = input.status ?? "NEW";
      const task: AutomationTaskRecord = {
        taskId: input.taskId,
        sprint: input.sprint,
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
        currentStage: input.currentStage ?? statusToPipelineStage(status),
        title: input.title,
        goal: input.goal,
      };

      await repository.saveTask(task);
      return task;
    },

    async updateTask(taskId: string, input: UpdateTaskInput): Promise<AutomationTaskRecord> {
      const task = await repository.loadTask(taskId);
      if (!task) {
        throw new Error(`Automation task not found: ${taskId}`);
      }

      if (input.status) {
        assertTaskTransition(task.status, input.status);
      }

      const nextStatus = input.status ?? task.status;
      const updated: AutomationTaskRecord = {
        ...task,
        ...input,
        status: nextStatus,
        currentStage:
          input.currentStage !== undefined
            ? input.currentStage
            : statusToPipelineStage(nextStatus),
        updatedAt: now(),
      };

      await repository.saveTask(updated);
      return updated;
    },

    async loadTask(taskId: string): Promise<AutomationTaskRecord | null> {
      return repository.loadTask(taskId);
    },

    async listTasks(): Promise<AutomationTaskRecord[]> {
      return repository.listTasks();
    },

    async archiveTask(taskId: string): Promise<AutomationTaskRecord> {
      return this.updateTask(taskId, {
        archivedAt: now(),
      });
    },

    async savePipelineState(state: AutomationPipelineState): Promise<void> {
      await repository.savePipelineState({
        ...state,
        updatedAt: now(),
      });
    },

    async loadPipelineState(taskId: string): Promise<AutomationPipelineState | null> {
      return repository.loadPipelineState(taskId);
    },
  };
}
