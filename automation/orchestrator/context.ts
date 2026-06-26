import { ConsoleAutomationLogger } from "./logger";
import { createAutomationStateManager, type AutomationStateManager } from "../state/manager";
import {
  automationSchemas,
  type AutomationContext,
  type AutomationLogger,
  type PipelineConfig,
} from "./types";

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  qaBlocking: true,
  screenshotBlocking: false,
};

export interface CreateAutomationContextOptions {
  logger?: AutomationLogger;
  now?: () => string;
  config?: Partial<PipelineConfig>;
  stateManager?: AutomationStateManager;
}

export function createAutomationContext(
  options: CreateAutomationContextOptions = {},
): AutomationContext {
  return {
    logger: options.logger ?? new ConsoleAutomationLogger(),
    schemas: automationSchemas,
    config: {
      ...DEFAULT_PIPELINE_CONFIG,
      ...options.config,
    },
    stateManager: options.stateManager ?? createAutomationStateManager(),
    now: options.now ?? (() => new Date().toISOString()),
  };
}
