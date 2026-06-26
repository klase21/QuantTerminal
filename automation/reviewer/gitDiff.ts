import { execFile } from "child_process";
import { promisify } from "util";
import type { GitDiffSummary } from "./types";

const execFileAsync = promisify(execFile);

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

export async function collectGitDiffSummary(cwd: string = process.cwd()): Promise<GitDiffSummary> {
  const errors: string[] = [];
  let statusShort = "";
  let diffStat = "";
  let changedFiles: string[] = [];

  try {
    statusShort = await runGit(["status", "--short"], cwd);
  } catch (error) {
    errors.push(`git status --short failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    diffStat = await runGit(["diff", "--stat"], cwd);
  } catch (error) {
    errors.push(`git diff --stat failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const output = await runGit(["diff", "--name-only"], cwd);
    changedFiles = output.length > 0 ? output.split(/\r?\n/).filter(Boolean) : [];
  } catch (error) {
    errors.push(`git diff --name-only failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    statusShort,
    diffStat,
    changedFiles,
    errors,
  };
}
