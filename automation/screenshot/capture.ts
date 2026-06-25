import { StubBrowserScreenshotAdapter, type BrowserScreenshotAdapter } from "./browser";
import { waitForApplicationReady } from "./readiness";
import { DASHBOARD_VIEWPORTS } from "./viewports";
import type {
  CaptureDashboardScreenshotsOptions,
  DashboardScreenshotResult,
  ScreenshotCaptureResult,
  ScreenshotStructuredError,
  ViewportDefinition,
} from "./types";

function buildOutputPath(outputDir: string, viewport: ViewportDefinition): string {
  return `${outputDir}/dashboard-${viewport.name}-${viewport.width}x${viewport.height}.png`;
}

function skippedCapture(
  viewport: ViewportDefinition,
  reason: ScreenshotStructuredError["reason"],
  message: string,
): ScreenshotCaptureResult {
  return {
    status: "skipped",
    viewport,
    reason,
    message,
  };
}

export async function captureDashboardScreenshots(
  options: CaptureDashboardScreenshotsOptions & {
    adapter?: BrowserScreenshotAdapter;
  } = {},
): Promise<DashboardScreenshotResult> {
  const timestamp = new Date().toISOString();
  const outputDir = options.outputDir ?? "automation/screenshot/output";
  const readiness = await waitForApplicationReady(options);

  if (!readiness.ready) {
    const reason = readiness.reason ?? "page_not_ready";
    const message = readiness.message ?? "Dashboard was not ready for screenshot capture.";
    const errors: ScreenshotStructuredError[] = [
      {
        reason,
        message,
      },
    ];

    return {
      desktop: skippedCapture(DASHBOARD_VIEWPORTS.desktop, reason, message),
      laptop: skippedCapture(DASHBOARD_VIEWPORTS.laptop, reason, message),
      tablet: skippedCapture(DASHBOARD_VIEWPORTS.tablet, reason, message),
      mobile: skippedCapture(DASHBOARD_VIEWPORTS.mobile, reason, message),
      timestamp,
      status: "blocked",
      errors,
    };
  }

  const adapter = options.adapter ?? new StubBrowserScreenshotAdapter();
  const desktop = await adapter.capture({
    url: readiness.url,
    viewport: DASHBOARD_VIEWPORTS.desktop,
    outputPath: buildOutputPath(outputDir, DASHBOARD_VIEWPORTS.desktop),
  });
  const laptop = await adapter.capture({
    url: readiness.url,
    viewport: DASHBOARD_VIEWPORTS.laptop,
    outputPath: buildOutputPath(outputDir, DASHBOARD_VIEWPORTS.laptop),
  });
  const tablet = await adapter.capture({
    url: readiness.url,
    viewport: DASHBOARD_VIEWPORTS.tablet,
    outputPath: buildOutputPath(outputDir, DASHBOARD_VIEWPORTS.tablet),
  });
  const mobile = await adapter.capture({
    url: readiness.url,
    viewport: DASHBOARD_VIEWPORTS.mobile,
    outputPath: buildOutputPath(outputDir, DASHBOARD_VIEWPORTS.mobile),
  });

  const captures = [desktop, laptop, tablet, mobile];
  const errors = captures
    .filter((capture) => capture.status === "failed" || capture.status === "blocked")
    .map((capture): ScreenshotStructuredError => ({
      reason: capture.reason ?? "screenshot_failure",
      message: capture.message ?? "Screenshot capture failed.",
      viewport: capture.viewport.name,
    }));

  return {
    desktop,
    laptop,
    tablet,
    mobile,
    timestamp,
    status: errors.length > 0 ? "failed" : "skipped",
    errors,
  };
}
