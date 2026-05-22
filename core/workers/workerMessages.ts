export type TerminalWorkerJob =
  | { type: "CALCULATE_REGIME"; payload: unknown }
  | { type: "BUILD_REPLAY"; payload: unknown }
  | { type: "BACKTEST_ALERTS"; payload: unknown }

export type TerminalWorkerResult =
  | { type: "REGIME_RESULT"; payload: unknown }
  | { type: "REPLAY_RESULT"; payload: unknown }
  | { type: "BACKTEST_RESULT"; payload: unknown }
  | { type: "ERROR"; error: string }
