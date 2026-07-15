export type LicenseClassification =
  | "PUBLIC_API_KEY_REQUIRED"
  | "COMMERCIAL_API_KEY_REQUIRED"
  | "PUBLIC_HTML_ATTRIBUTION_REQUIRED"

export type ExternalContextState = "READY" | "CONFIGURATION_REQUIRED" | "RATE_LIMITED" | "INVALID_RESPONSE" | "TOO_LARGE"

export interface ExternalContextFailure {
  readonly state: Exclude<ExternalContextState, "READY">
  readonly reason: string
}

export interface ExternalContextRequest {
  readonly method: "GET"
  readonly url: string
  readonly redactedUrl: string
  readonly identity: string
}

export type ExternalContextResult<T> =
  | { readonly state: "READY"; readonly value: T }
  | ExternalContextFailure

export function createPublicRequestIdentity(provider: string, operation: string, parameters: Readonly<Record<string, string | number | boolean | undefined>>): string {
  const publicParameters = Object.entries(parameters)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

  return `${provider}:${operation}:${publicParameters.join("&")}`
}

export function redactQueryParameter(url: URL, parameter: string): string {
  const redacted = new URL(url.toString())
  if (redacted.searchParams.has(parameter)) redacted.searchParams.set(parameter, "REDACTED")
  return redacted.toString()
}
