import type { ScreenshotCaptureResult, ViewportDefinition } from "./types";

export interface BrowserScreenshotAdapter {
  capture(options: {
    url: string;
    viewport: ViewportDefinition;
    outputPath: string;
  }): Promise<ScreenshotCaptureResult>;
}

export class StubBrowserScreenshotAdapter implements BrowserScreenshotAdapter {
  async capture(options: {
    url: string;
    viewport: ViewportDefinition;
    outputPath: string;
  }): Promise<ScreenshotCaptureResult> {
    return {
      status: "skipped",
      viewport: options.viewport,
      path: options.outputPath,
      reason: "screenshot_failure",
      message: `Screenshot capture for ${options.url} is stubbed until a browser adapter is integrated.`,
    };
  }
}
