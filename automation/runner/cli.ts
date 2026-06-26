import type { RunnerCliOptions } from "./types";

function printUsage(): never {
  throw new Error(
    [
      "Usage:",
      "  npx tsx automation/runner/runAutomation.ts --task <path> [--config <path>] [--dry-run] [--verbose]",
    ].join("\n"),
  );
}

export function parseRunnerArgs(argv: string[]): RunnerCliOptions {
  let taskPath = "";
  let configPath: string | undefined;
  let dryRun = false;
  let verbose = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--task": {
        const value = argv[index + 1];
        if (!value) {
          printUsage();
        }
        taskPath = value;
        index += 1;
        break;
      }
      case "--config": {
        const value = argv[index + 1];
        if (!value) {
          printUsage();
        }
        configPath = value;
        index += 1;
        break;
      }
      case "--dry-run":
        dryRun = true;
        break;
      case "--verbose":
        verbose = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        break;
      default:
        throw new Error(`Unknown runner argument: ${arg}`);
    }
  }

  if (!taskPath) {
    printUsage();
  }

  return {
    taskPath,
    configPath,
    dryRun,
    verbose,
  };
}
