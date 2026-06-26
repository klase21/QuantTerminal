import { promises as fs } from "fs";
import path from "path";
import taskSchema from "../contracts/task.schema.json";
import type { TaskMessage } from "../orchestrator/types";
import type { LoadedTask } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Task field ${field} must be a non-empty string.`);
  }

  return value;
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw new Error(`Task field ${field} must be an array of non-empty strings.`);
  }

  return value;
}

function validateTaskSchema(task: unknown): TaskMessage {
  if (!isObject(task)) {
    throw new Error("Task must be a JSON object.");
  }

  const required = Array.isArray(taskSchema.required) ? taskSchema.required : [];
  for (const field of required) {
    if (!(field in task)) {
      throw new Error(`Task is missing required schema field: ${field}`);
    }
  }

  const task_id = assertString(task.task_id, "task_id");
  const sprint = assertString(task.sprint, "sprint");

  return {
    task_id,
    sprint,
    title: assertString(task.title, "title"),
    goal: assertString(task.goal, "goal"),
    scope: assertStringArray(task.scope, "scope"),
    constraints: assertStringArray(task.constraints, "constraints"),
    files: assertStringArray(task.files, "files"),
    validation: assertStringArray(task.validation, "validation"),
    expected_output: assertStringArray(task.expected_output, "expected_output"),
  };
}

export async function loadTask(taskPath: string): Promise<LoadedTask> {
  const resolvedPath = path.resolve(taskPath);

  try {
    const text = await fs.readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(text) as unknown;
    return {
      task: validateTaskSchema(parsed),
      path: resolvedPath,
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = String((error as { code?: unknown }).code ?? "");
      if (code === "ENOENT") {
        throw new Error(`Task file does not exist: ${resolvedPath}`);
      }
    }

    throw error;
  }
}
