import { spawn } from "child_process";
import { STANDARD_QA_COMMANDS, formatCommand } from "./commands";
import { buildQaReport } from "./report";
import type { QaCommand, QaCommandResult, QaFailureReason, RunQaChecksOptions } from "./types";

function classifySpawnError(error: unknown): QaFailureReason {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (code === "ENOENT") {
      return "command_unavailable";
    }
  }

  return "unknown_error";
}

function runCommand(command: QaCommand, cwd?: string, env?: NodeJS.ProcessEnv): Promise<QaCommandResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const child = spawn(command.command, command.args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, command.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const reason = classifySpawnError(error);
      const durationMs = Date.now() - startedAt;

      resolve({
        id: command.id,
        name: command.name,
        command: formatCommand(command),
        status: command.blocking ? "blocked" : "failed",
        exitCode: null,
        stdout,
        stderr: stderr || (error instanceof Error ? error.message : String(error)),
        durationMs,
        blocking: command.blocking,
        reason,
        summary: `${command.name} could not start: ${reason}.`,
      });
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;

      if (timedOut) {
        resolve({
          id: command.id,
          name: command.name,
          command: formatCommand(command),
          status: command.blocking ? "blocked" : "failed",
          exitCode,
          stdout,
          stderr,
          durationMs,
          blocking: command.blocking,
          reason: "command_timed_out",
          summary: `${command.name} timed out after ${command.timeoutMs}ms.`,
        });
        return;
      }

      if (exitCode === 0) {
        resolve({
          id: command.id,
          name: command.name,
          command: formatCommand(command),
          status: "passed",
          exitCode,
          stdout,
          stderr,
          durationMs,
          blocking: command.blocking,
          summary: `${command.name} passed.`,
        });
        return;
      }

      resolve({
        id: command.id,
        name: command.name,
        command: formatCommand(command),
        status: command.blocking ? "blocked" : "failed",
        exitCode,
        stdout,
        stderr,
        durationMs,
        blocking: command.blocking,
        reason: "command_failed",
        summary: `${command.name} failed with exit code ${exitCode}.`,
      });
    });
  });
}

export async function runQaChecks(options: RunQaChecksOptions = {}) {
  const commands = options.commands ?? STANDARD_QA_COMMANDS;
  const checks: QaCommandResult[] = [];

  for (const command of commands) {
    const result = await runCommand(command, options.cwd, options.env);
    checks.push(result);

    if (command.blocking && result.status !== "passed") {
      break;
    }
  }

  return buildQaReport(checks, options.taskId);
}
