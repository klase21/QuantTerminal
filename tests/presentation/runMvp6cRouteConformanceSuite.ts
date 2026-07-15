import assert from "node:assert/strict";

import demoProfile from "../../docs/project/mvp-default-demo-event.json";
import {
  buildMvpRouteHref,
  mvpApiQuery,
  normalizeMvpRouteContext,
} from "../../lib/mvp-route-context";

const querylessTrade = normalizeMvpRouteContext("trade", new URLSearchParams());
assert.equal(querylessTrade.get("instrument"), demoProfile.primary.instrument);

const querylessReplay = normalizeMvpRouteContext(
  "replay",
  new URLSearchParams(),
);
assert.equal(querylessReplay.get("instrument"), demoProfile.primary.instrument);
assert.equal(querylessReplay.get("start"), demoProfile.primary.eventTimeStart);
assert.equal(querylessReplay.get("end"), demoProfile.primary.eventTimeEnd);
assert.equal(querylessReplay.get("timestamp"), demoProfile.primary.eventTimeStart);

const routeNeutral = normalizeMvpRouteContext(
  "replay",
  new URLSearchParams({
    instrument: "ETHUSDT",
    exchange: "binance_futures",
    timeframe: "5m",
    start: demoProfile.primary.eventTimeStart,
    end: demoProfile.primary.eventTimeEnd,
    timestamp: demoProfile.primary.eventTimeEnd,
  }),
);
assert.equal(routeNeutral.get("instrument"), "ETHUSDT");
assert.equal(routeNeutral.get("exchange"), "binance_futures");
assert.equal(routeNeutral.get("timeframe"), "5m");
assert.equal(routeNeutral.get("timestamp"), demoProfile.primary.eventTimeStart);

assert.equal(
  normalizeMvpRouteContext(
    "replay",
    new URLSearchParams({
      projection: demoProfile.primary.researchProjectionVersionId,
    }),
  ).has("projection"),
  false,
);
assert.equal(
  normalizeMvpRouteContext(
    "trade",
    new URLSearchParams({
      instrument: "SOLUSDT",
      projection: demoProfile.primary.replayProjectionVersionId,
      evidence: demoProfile.primary.evidencePacketId,
    }),
  ).has("projection"),
  false,
);
assert.equal(
  normalizeMvpRouteContext(
    "research",
    new URLSearchParams({
      projection: demoProfile.primary.replayProjectionVersionId,
    }),
  ).has("projection"),
  false,
);

const neutralNavigation = buildMvpRouteHref(
  "markets",
  new URLSearchParams({
    instrument: "SOLUSDT",
    start: demoProfile.backup.eventTimeStart,
    end: demoProfile.backup.eventTimeEnd,
    projection: demoProfile.backup.replayProjectionVersionId,
    evidence: demoProfile.backup.evidencePacketId,
    candidate: "candidate-stale",
  }),
);
assert.match(neutralNavigation, /^\/markets\?/);
assert.match(neutralNavigation, /instrument=SOLUSDT/);
assert.doesNotMatch(neutralNavigation, /projection=|evidence=|candidate=/);

const tradeApi = mvpApiQuery(
  "trade",
  new URLSearchParams({ instrument: "ETHUSDT", candidate: "candidate-stale" }),
);
assert.equal(tradeApi.get("instrument"), "ETHUSDT");
assert.equal(tradeApi.has("candidate"), false);
assert.equal(tradeApi.get("view"), "trade");

const explicitResearch = buildMvpRouteHref("research", new URLSearchParams(), {
  instrument: demoProfile.primary.instrument,
  start: demoProfile.primary.eventTimeStart,
  end: demoProfile.primary.eventTimeEnd,
  projection: demoProfile.primary.researchProjectionVersionId,
  evidence: demoProfile.primary.evidencePacketId,
});
assert.match(explicitResearch, /projection=mvpv_/);
assert.match(explicitResearch, /evidence=epkt_/);

const replayHandoff = buildMvpRouteHref(
  "replay",
  new URLSearchParams({
    instrument: "SOLUSDT",
    candidate: "scanner-candidate",
    projection: demoProfile.primary.researchProjectionVersionId,
  }),
  {
    start: demoProfile.backup.eventTimeStart,
    end: demoProfile.backup.eventTimeEnd,
  },
);
assert.match(replayHandoff, /instrument=SOLUSDT/);
assert.doesNotMatch(replayHandoff, /candidate=|167c4546/);

console.log("MVP-6C route conformance suite passed");
