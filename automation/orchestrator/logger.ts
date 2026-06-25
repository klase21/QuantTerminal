import type { AutomationLogger, PipelineStage, StageStatus } from "./types";

export class ConsoleAutomationLogger implements AutomationLogger {
  stageStart(stage: PipelineStage): void {
    this.info(`START ${stage}`);
  }

  stageEnd(stage: PipelineStage, status: StageStatus): void {
    this.info(`END ${stage} ${status}`);
  }

  stageFailure(stage: PipelineStage, errors: string[]): void {
    this.info(`FAIL ${stage} ${errors.join("; ")}`);
  }

  info(message: string): void {
    console.log(`[automation] ${message}`);
  }
}

export class SilentAutomationLogger implements AutomationLogger {
  stageStart(): void {}
  stageEnd(): void {}
  stageFailure(): void {}
  info(): void {}
}
