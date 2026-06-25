export type ScreenshotStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "blocked";

export type ReadinessFailureReason =
  | "timeout"
  | "localhost_unavailable"
  | "page_not_ready";

export type ScreenshotFailureReason =
  | ReadinessFailureReason
  | "screenshot_failure";

export interface ViewportDefinition {
  name: "desktop" | "laptop" | "tablet" | "mobile";
  width: number;
  height: number;
}

export interface ReadinessOptions {
  baseUrl?: string;
  dashboardPath?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  fetcher?: typeof fetch;
}

export interface ApplicationReadyResult {
  ready: boolean;
  status: ScreenshotStatus;
  url: string;
  checkedAt: string;
  reason?: ReadinessFailureReason;
  message?: string;
  httpStatus?: number;
}

export interface ScreenshotCaptureResult {
  status: ScreenshotStatus;
  viewport: ViewportDefinition;
  path?: string;
  reason?: ScreenshotFailureReason;
  message?: string;
}

export interface DashboardScreenshotResult {
  desktop: ScreenshotCaptureResult;
  laptop: ScreenshotCaptureResult;
  tablet: ScreenshotCaptureResult;
  mobile: ScreenshotCaptureResult;
  timestamp: string;
  status: ScreenshotStatus;
  errors: ScreenshotStructuredError[];
}

export interface ScreenshotStructuredError {
  reason: ScreenshotFailureReason;
  message: string;
  viewport?: ViewportDefinition["name"];
}

export interface CaptureDashboardScreenshotsOptions extends ReadinessOptions {
  outputDir?: string;
}
