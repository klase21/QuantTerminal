import { promises as fs } from "fs";
import path from "path";
import type { PipelineConfig } from "../orchestrator/types";
import type { RunnerConfig } from "./types";

const DEFAULT_SUMMARY_OUTPUT_DIR = path.join(process.cwd(), "automation", "state", "data", "results");

export const DEFAULT_RUNNER_CONFIG: Required<Pick<RunnerConfig, "qaBlocking" | "screenshotBlocking" | "summaryOutputDir">> = {
  qaBlocking: true,
  screenshotBlocking: false,
  summaryOutputDir: DEFAULT_SUMMARY_OUTPUT_DIR,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`Runner config field ${field} must be boolean.`);
  }

  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Runner config field ${field} must be a non-empty string.`);
  }

  return value;
}

export async function loadRunnerConfig(configPath?: string): Promise<RunnerConfig> {
  if (!configPath) {
    return {};
  }

  const resolvedPath = path.resolve(configPath);
  const text = await fs.readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(text) as unknown;

  if (!isObject(parsed)) {
    throw new Error(`Runner config must be a JSON object: ${resolvedPath}`);
  }

  return {
    qaBlocking: optionalBoolean(parsed.qaBlocking, "qaBlocking"),
    screenshotBlocking: optionalBoolean(parsed.screenshotBlocking, "screenshotBlocking"),
    stateRoot: optionalString(parsed.stateRoot, "stateRoot"),
    summaryOutputDir: optionalString(parsed.summaryOutputDir, "summaryOutputDir"),
  };
}

export function resolvePipelineConfig(config: RunnerConfig): PipelineConfig {
  return {
    qaBlocking: config.qaBlocking ?? DEFAULT_RUNNER_CONFIG.qaBlocking,
    screenshotBlocking: config.screenshotBlocking ?? DEFAULT_RUNNER_CONFIG.screenshotBlocking,
  };
}

export function resolveSummaryOutputDir(config: RunnerConfig): string {
  return path.resolve(config.summaryOutputDir ?? DEFAULT_RUNNER_CONFIG.summaryOutputDir);
}
