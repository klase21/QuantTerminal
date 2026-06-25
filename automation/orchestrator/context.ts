import { ConsoleAutomationLogger } from "./logger";
import { automationSchemas, type AutomationContext, type AutomationLogger } from "./types";

export interface CreateAutomationContextOptions {
  logger?: AutomationLogger;
  now?: () => string;
}

export function createAutomationContext(
  options: CreateAutomationContextOptions = {},
): AutomationContext {
  return {
    logger: options.logger ?? new ConsoleAutomationLogger(),
    schemas: automationSchemas,
    now: options.now ?? (() => new Date().toISOString()),
  };
}
