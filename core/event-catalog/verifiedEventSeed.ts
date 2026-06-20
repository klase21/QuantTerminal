import {
  VERIFIED_EVENT_CATALOG_VERSION,
  VERIFIED_EVENT_SCHEMA_VERSION,
  type VerifiedEventCatalog,
  type VerifiedEventSource,
} from "./verifiedEventTypes"

const FEDERAL_RESERVE: VerifiedEventSource = {
  id: "federal-reserve",
  name: "Board of Governors of the Federal Reserve System",
  url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
}

export const VERIFIED_EVENT_SEED_CATALOG: VerifiedEventCatalog = {
  catalogVersion: VERIFIED_EVENT_CATALOG_VERSION,
  schemaVersion: VERIFIED_EVENT_SCHEMA_VERSION,
  generatedAt: "2026-06-20T00:00:00.000Z",
  events: [
    {
      schemaVersion: VERIFIED_EVENT_SCHEMA_VERSION,
      eventId: "macro-fomc-statement-2024-01-31",
      title: "Federal Reserve issues FOMC statement",
      category: "macro",
      timestamp: "2024-01-31T19:00:00.000Z",
      source: {
        ...FEDERAL_RESERVE,
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240131a.htm",
      },
      evidence: [
        {
          evidenceId: "federal-reserve-fomc-statement-2024-01-31",
          kind: "official_statement",
          source: {
            ...FEDERAL_RESERVE,
            url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240131a.htm",
          },
          observedAt: "2024-01-31T19:00:00.000Z",
          description: "Official Federal Reserve FOMC statement released at 2:00 p.m. EST.",
        },
      ],
      affectedSymbols: ["BTCUSDT", "ETHUSDT"],
      affectedExchanges: ["binance_futures", "binance_spot"],
      tags: ["fomc", "interest-rates", "scheduled-macro"],
      metadata: {
        timestampSemantics: "official_publication_time",
        marketScope: "broad-risk-assets",
      },
    },
    {
      schemaVersion: VERIFIED_EVENT_SCHEMA_VERSION,
      eventId: "macro-fomc-statement-2024-03-20",
      title: "Federal Reserve issues FOMC statement",
      category: "macro",
      timestamp: "2024-03-20T18:00:00.000Z",
      source: {
        ...FEDERAL_RESERVE,
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240320a.htm",
      },
      evidence: [
        {
          evidenceId: "federal-reserve-fomc-statement-2024-03-20",
          kind: "official_statement",
          source: {
            ...FEDERAL_RESERVE,
            url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240320a.htm",
          },
          observedAt: "2024-03-20T18:00:00.000Z",
          description: "Official Federal Reserve FOMC statement released at 2:00 p.m. EDT.",
        },
      ],
      affectedSymbols: ["BTCUSDT", "ETHUSDT"],
      affectedExchanges: ["binance_futures", "binance_spot"],
      tags: ["fomc", "interest-rates", "scheduled-macro"],
      metadata: {
        timestampSemantics: "official_publication_time",
        marketScope: "broad-risk-assets",
      },
    },
  ],
}
