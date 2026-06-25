import type { ApplicationReadyResult, ReadinessOptions } from "./types";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_DASHBOARD_PATH = "/dashboard";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_POLL_INTERVAL_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDashboardUrl(baseUrl: string, dashboardPath: string): string {
  return new URL(dashboardPath, baseUrl).toString();
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function dashboardLooksRendered(html: string): boolean {
  const normalized = html.toLowerCase();
  return (
    normalized.includes("dashboard") ||
    normalized.includes("market direction") ||
    normalized.includes("__next")
  );
}

export async function waitForApplicationReady(
  options: ReadinessOptions = {},
): Promise<ApplicationReadyResult> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const dashboardPath = options.dashboardPath ?? DEFAULT_DASHBOARD_PATH;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const fetcher = options.fetcher ?? fetch;
  const url = buildDashboardUrl(baseUrl, dashboardPath);
  const startedAt = Date.now();
  let lastStatus: number | undefined;
  let sawLocalhost = false;
  let lastMessage = "Application did not respond before readiness polling started.";

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      const response = await fetcher(url, { method: "GET" });
      lastStatus = response.status;
      sawLocalhost = true;

      if (!response.ok) {
        lastMessage = `Dashboard responded with HTTP ${response.status}.`;
      } else {
        const html = await readResponseText(response);
        if (dashboardLooksRendered(html)) {
          return {
            ready: true,
            status: "passed",
            url,
            checkedAt: new Date().toISOString(),
            httpStatus: response.status,
          };
        }

        lastMessage = "Dashboard responded but the rendered page marker was not found.";
      }
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
    }

    await sleep(pollIntervalMs);
  }

  if (!sawLocalhost) {
    return {
      ready: false,
      status: "blocked",
      url,
      checkedAt: new Date().toISOString(),
      reason: "localhost_unavailable",
      message: `Localhost was unavailable before timeout: ${lastMessage}`,
      httpStatus: lastStatus,
    };
  }

  if (lastStatus && lastStatus >= 200 && lastStatus < 500) {
    return {
      ready: false,
      status: "blocked",
      url,
      checkedAt: new Date().toISOString(),
      reason: "page_not_ready",
      message: lastMessage,
      httpStatus: lastStatus,
    };
  }

  return {
    ready: false,
    status: "blocked",
    url,
    checkedAt: new Date().toISOString(),
    reason: "timeout",
    message: `Timed out after ${timeoutMs}ms waiting for Dashboard readiness: ${lastMessage}`,
    httpStatus: lastStatus,
  };
}
