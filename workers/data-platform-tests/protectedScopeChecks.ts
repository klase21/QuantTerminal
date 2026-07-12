const allowed = ["lib/data-platform/persistence/", "workers/data-platform-tests/", "docs/architecture/", "docs/adr/", "docs/project/"]
export function pathsStayInD2Scope(paths: readonly string[]): boolean { return paths.every((file) => allowed.some((root) => file.replace(/\\/g, "/").startsWith(root))) }
export const protectedScopeFixturePasses = pathsStayInD2Scope(["lib/data-platform/persistence/contracts.ts", "docs/adr/ADR-008-canonical-persistence.md"])
export const protectedScopeFixtureRejects = !pathsStayInD2Scope(["lib/persistence/postgres/adapter.ts"])
