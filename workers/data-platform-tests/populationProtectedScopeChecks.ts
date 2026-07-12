const allowed = ["lib/data-platform/population/", "workers/data-platform-tests/", "docs/architecture/", "docs/adr/", "docs/project/"]
export function pathsStayInD3Phase1Scope(paths: readonly string[]): boolean { return paths.every((file) => allowed.some((root) => file.replace(/\\/g, "/").startsWith(root))) }
export const phase1ScopePasses = pathsStayInD3Phase1Scope(["lib/data-platform/population/contracts.ts", "docs/project/d3-phase-1-implementation-report.md"])
export const protectedScopeRejected = !pathsStayInD3Phase1Scope(["lib/historical-backfill/backfill.ts"])
