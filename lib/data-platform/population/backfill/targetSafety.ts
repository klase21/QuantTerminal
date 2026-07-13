export type DurableTargetKind = "D2_CANONICAL" | "D3_POPULATION"
export interface DurableTargetInspection { readonly safe: boolean; readonly redactedTarget: string; readonly database: string | null; readonly role: string | null; readonly reasons: readonly string[] }

const DENIED_DATABASES = new Set(["quantterminal_d2_isolated", "quantterminal_d3_isolated", "quantterminal_d4_isolated", "postgres", "template0", "template1"])
const ALLOWED: Readonly<Record<DurableTargetKind, RegExp>> = Object.freeze({ D2_CANONICAL: /^quantterminal_d2_(?:backfill|nonprod|development)$/, D3_POPULATION: /^quantterminal_d3_(?:backfill|nonprod|development)$/ })

export function inspectDurablePostgresTarget(connectionString: string | undefined, kind: DurableTargetKind): DurableTargetInspection {
  if (!connectionString?.trim()) return Object.freeze({ safe: false, redactedTarget: "UNAVAILABLE", database: null, role: null, reasons: Object.freeze(["TARGET_MISSING"]) })
  const reasons: string[] = []
  let url: URL
  try { url = new URL(connectionString) } catch { return Object.freeze({ safe: false, redactedTarget: "INVALID", database: null, role: null, reasons: Object.freeze(["TARGET_URL_INVALID"]) }) }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  const role = decodeURIComponent(url.username || "") || null
  if (!/^postgres(?:ql)?:$/.test(url.protocol)) reasons.push("TARGET_PROTOCOL_INVALID")
  if (!database || DENIED_DATABASES.has(database)) reasons.push("CERTIFICATION_OR_SYSTEM_DATABASE_REJECTED")
  if (!ALLOWED[kind].test(database)) reasons.push("DATABASE_NOT_ALLOWLISTED")
  if (/prod(?:uction)?/i.test(database) || /prod(?:uction)?/i.test(url.hostname)) reasons.push("PRODUCTION_LIKE_TARGET_REJECTED")
  const port = url.port || "5432"
  return Object.freeze({ safe: reasons.length === 0, redactedTarget: `${url.hostname}:${port}/${database}`, database: database || null, role, reasons: Object.freeze(reasons) })
}

export function inspectDurableTargetSeparation(input: { readonly d2: string | undefined; readonly d3: string | undefined; readonly d2Certification?: string | undefined; readonly d3Certification?: string | undefined; readonly d4?: string | undefined }): readonly string[] {
  const errors: string[] = []
  const normalize = (value: string | undefined) => value?.trim() || null
  const d2 = normalize(input.d2); const d3 = normalize(input.d3)
  if (d2 && d3 && d2 === d3) errors.push("D2_D3_TARGETS_MUST_DIFFER")
  for (const [name, value] of [["D2", d2], ["D3", d3]] as const) {
    if (value && [normalize(input.d2Certification), normalize(input.d3Certification), normalize(input.d4)].includes(value)) errors.push(`${name}_TARGET_REUSES_CERTIFICATION_DATABASE`)
  }
  return Object.freeze(errors)
}
