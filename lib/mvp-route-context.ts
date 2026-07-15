import demoProfile from "@/docs/project/mvp-default-demo-event.json";

export const MVP_ROUTE_VIEWS = [
  "dashboard",
  "markets",
  "scanner",
  "trade",
  "replay",
  "research",
] as const;
export type MvpRouteView = (typeof MVP_ROUTE_VIEWS)[number];

const ROUTES: Record<MvpRouteView, string> = {
  dashboard: "/dashboard",
  markets: "/markets",
  scanner: "/scanner",
  trade: "/trade",
  replay: "/replay",
  research: "/research",
};

function first(params: URLSearchParams, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }
  return undefined;
}

export function normalizeMvpRouteContext(
  view: MvpRouteView,
  source: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams();
  const instrument = first(source, "instrument", "symbol")?.toUpperCase();
  const exchange = first(source, "exchange");
  const timeframe = first(source, "timeframe");
  const start = first(source, "start");
  const end = first(source, "end");
  const timestamp = first(source, "timestamp");

  if (instrument) next.set("instrument", instrument);
  if (exchange) next.set("exchange", exchange);
  if (timeframe) next.set("timeframe", timeframe);
  if (start) next.set("start", start);
  if (end) next.set("end", end);
  if (timestamp && (view === "replay" || view === "research")) {
    const selected = Date.parse(timestamp);
    const lower = Date.parse(start ?? "");
    const upper = Date.parse(end ?? "");
    if (
      Number.isFinite(selected) &&
      (!Number.isFinite(lower) || selected >= lower) &&
      (!Number.isFinite(upper) || selected < upper)
    )
      next.set("timestamp", new Date(selected).toISOString());
  }

  if (!next.has("instrument"))
    next.set("instrument", demoProfile.primary.instrument);
  if (
    (view === "replay" || view === "research") &&
    (!next.has("start") || !next.has("end"))
  ) {
    next.set("start", demoProfile.primary.eventTimeStart);
    next.set("end", demoProfile.primary.eventTimeEnd);
  }
  if (view === "replay" && !next.has("timestamp"))
    next.set(
      "timestamp",
      next.get("start") ?? demoProfile.primary.eventTimeStart,
    );

  if (view === "trade") {
    const candidate = first(source, "candidate", "candidateId");
    if (candidate) next.set("candidate", candidate);
  }

  if (view === "replay" || view === "research") {
    const projection = first(source, "projection", "projectionId");
    const knownForRoute =
      view === "replay"
        ? [
            demoProfile.primary.replayProjectionVersionId,
            demoProfile.backup.replayProjectionVersionId,
          ]
        : [
            demoProfile.primary.researchProjectionVersionId,
            demoProfile.backup.researchProjectionVersionId,
          ];
    if (projection && knownForRoute.includes(projection))
      next.set("projection", projection);
  }

  if (view === "research") {
    const evidence = first(source, "evidence", "evidenceId");
    if (evidence) next.set("evidence", evidence);
  }

  return next;
}

export function buildMvpRouteHref(
  view: MvpRouteView,
  source: URLSearchParams,
  additions: Record<string, string> = {},
): string {
  const merged = new URLSearchParams(source);
  Object.entries(additions).forEach(([key, value]) =>
    value ? merged.set(key, value) : merged.delete(key),
  );
  const normalized = normalizeMvpRouteContext(view, merged);
  const query = normalized.toString();
  return query ? `${ROUTES[view]}?${query}` : ROUTES[view];
}

export function mvpApiQuery(
  view: MvpRouteView,
  source: URLSearchParams,
): URLSearchParams {
  const next = normalizeMvpRouteContext(view, source);
  next.delete("timestamp");
  next.delete("evidence");
  next.delete("candidate");
  next.set("view", view);
  return next;
}
