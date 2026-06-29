const ACCESS_HEADER = "x-quantterminal-non-production-route"
const ACCESS_QUERY = "nonProductionRoute"
const ACCESS_ENABLED = "enabled"

function unavailableResponse(reason: string, status: 403 | 404) {
  return Response.json(
    {
      ok: false,
      status: "UNAVAILABLE",
      reason,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}

function hasExplicitOptIn(request: Request) {
  if (request.headers.get(ACCESS_HEADER)?.toLowerCase() === ACCESS_ENABLED) {
    return true
  }

  try {
    return new URL(request.url).searchParams.get(ACCESS_QUERY)?.toLowerCase() === ACCESS_ENABLED
  } catch {
    return false
  }
}

export function enforceNonProductionRouteIsolation(request: Request): Response | null {
  if (process.env.NODE_ENV === "production") {
    return unavailableResponse("This route is disabled.", 404)
  }

  if (!hasExplicitOptIn(request)) {
    return unavailableResponse("Explicit non-production route access is required.", 403)
  }

  return null
}
