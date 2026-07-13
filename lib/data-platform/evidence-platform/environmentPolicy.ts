export const D4_ISOLATED_DATABASE_NAME = "quantterminal_d4_isolated"
export const D4_ISOLATED_ENVIRONMENT_VARIABLE = "D4_ISOLATED_POSTGRES_URL"
export const D4_FORBIDDEN_DATABASE_NAMES = Object.freeze(["quantterminal_d2_isolated", "quantterminal_d3_isolated"])

export function inspectD4Target(target: string | undefined, d2: string | undefined, d3: string | undefined): { readonly safe: boolean; readonly reason: string } {
  if (!target) return { safe: false, reason: "D4_ISOLATED_POSTGRES_URL is required." }
  if (target === d2 || target === d3) return { safe: false, reason: "D2 or D3 URL reuse is prohibited." }
  try {
    const parsed = new URL(target)
    if (parsed.pathname.replace(/^\//, "") !== D4_ISOLATED_DATABASE_NAME) return { safe: false, reason: "D4 database name is not approved." }
    if (D4_FORBIDDEN_DATABASE_NAMES.includes(parsed.pathname.replace(/^\//, ""))) return { safe: false, reason: "Protected isolated database selected." }
    return { safe: true, reason: "D4 isolated target accepted." }
  } catch {
    return { safe: false, reason: "D4 target URL is invalid." }
  }
}
