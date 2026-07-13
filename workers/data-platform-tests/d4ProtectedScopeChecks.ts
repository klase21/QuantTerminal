const allowed = ["lib/data-platform/consistency/", "lib/data-platform/evidence-platform/", "lib/data-platform/consistency-evidence/", "workers/data-platform-tests/", "docs/architecture/", "docs/adr/", "docs/project/"]
export function pathsStayInD4Phase1Scope(paths: readonly string[]): boolean { return paths.every((file) => allowed.some((root) => file.replace(/\\/g, "/").startsWith(root))) }
export const d4ScopeAccepted = pathsStayInD4Phase1Scope(["lib/data-platform/consistency/contracts.ts", "lib/data-platform/evidence-platform/contracts.ts", "docs/adr/ADR-010-consistency-evidence.md"])
export const protectedRuntimeRejected = !pathsStayInD4Phase1Scope(["lib/evidence/evidencePacket.ts"])
export const d2Rejected = !pathsStayInD4Phase1Scope(["lib/data-platform/persistence/contracts.ts"])
export const d3Rejected = !pathsStayInD4Phase1Scope(["lib/data-platform/population/contracts.ts"])
