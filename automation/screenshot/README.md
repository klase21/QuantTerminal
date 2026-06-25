# Screenshot Harness

Status: Sprint A4 foundation

The Screenshot Harness defines the standard visual verification path for the Automation Layer. It is intentionally interface-first: no Playwright dependency, no browser launch, no external API call, and no Dashboard/runtime modification is introduced in A4.

## Execution Flow

```text
waitForApplicationReady()
↓
captureDashboardScreenshots()
↓
Screenshot artifact
↓
Review Agent
```

Current A4 behavior:

1. Poll `http://localhost:3000/dashboard` by default.
2. Confirm localhost responds.
3. Confirm the Dashboard route returns a rendered page marker.
4. Return structured readiness errors on failure.
5. Return stub screenshot capture results for all canonical viewports.

## Canonical Viewports

| Viewport | Size |
| --- | --- |
| Desktop | 1920 x 1080 |
| Laptop | 1440 x 900 |
| Tablet | 820 x 1180 |
| Mobile | 393 x 852 |

## Readiness Strategy

`waitForApplicationReady()` waits until the Dashboard route is reachable or the timeout expires.

Failure reasons:

- `localhost_unavailable`: the local application did not respond.
- `page_not_ready`: localhost responded, but the Dashboard page marker was not detected.
- `timeout`: readiness was not reached within the configured timeout.

The readiness check is explicit so visual review cannot accidentally certify a blank page, failed route, or unavailable local server.

## Future Playwright Integration

Future sprints can implement `BrowserScreenshotAdapter` using Playwright or another approved browser harness.

The adapter boundary is:

```ts
capture({
  url,
  viewport,
  outputPath
})
```

The pipeline should preserve the same output shape when real screenshots are enabled.

## Output Directory Structure

The default future output path is:

```text
automation/screenshot/output/
  dashboard-desktop-1920x1080.png
  dashboard-laptop-1440x900.png
  dashboard-tablet-820x1180.png
  dashboard-mobile-393x852.png
```

A4 does not create screenshots and does not write this directory.

## Constraints

- No Dashboard code changes.
- No product runtime changes.
- No `package.json` changes.
- No browser dependency.
- No Playwright integration yet.
- No screenshot files are generated in A4.
