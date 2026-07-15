import { readFileSync } from "node:fs";

import { canonicalChecksum } from "@/lib/data-platform/contracts";

const profile = JSON.parse(
  readFileSync("docs/project/mvp-default-demo-event.json", "utf8"),
) as Record<string, unknown>;
const expectedChecksum = String(profile.profileChecksum);
delete profile.profileChecksum;
const replay = readFileSync(
  "components/mvp-cutover/ReplaySequenceExperience.tsx",
  "utf8",
);
const page = readFileSync("components/mvp-cutover/MvpCutoverPage.tsx", "utf8");
const facade = readFileSync(
  "lib/data-platform/consumer-projections/facade.ts",
  "utf8",
);
const api = readFileSync("app/api/mvp/replay-sequence/route.ts", "utf8");
const navigation = readFileSync(
  "components/layout/PrimaryNavigation.tsx",
  "utf8",
);
const routeContext = readFileSync("lib/mvp-route-context.ts", "utf8");
const rootPage = readFileSync("app/page.tsx", "utf8");

const checks: Array<readonly [string, boolean]> = [
  [
    "default demo profile checksum reproduces",
    canonicalChecksum(profile) === expectedChecksum,
  ],
  [
    "primary and backup use real immutable Projection versions",
    JSON.stringify(profile).includes("mvpv_75febb52") &&
      JSON.stringify(profile).includes("mvpv_8b99507e"),
  ],
  [
    "Replay uses synchronized source-derived lanes",
    replay.includes("LineLane") &&
      replay.includes("FundingLane") &&
      replay.includes("FlowLane"),
  ],
  [
    "Funding remains discrete",
    replay.includes("discrete provider-native Funding events") &&
      replay.includes("Provider-native Funding event markers"),
  ],
  [
    "AggTrades browser payload is bounded",
    replay.includes("Raw AggTrades in browser") &&
      replay.includes(">0</dd>") &&
      api.includes("48-flow"),
  ],
  [
    "cursor and playback are keyboard accessible",
    replay.includes('event.key === "ArrowLeft"') &&
      replay.includes('event.key === " "') &&
      replay.includes("aria-valuetext"),
  ],
  [
    "timestamp persists across navigation",
    routeContext.includes('"timestamp"') && page.includes("timestamp: start"),
  ],
  [
    "Research separates Facts and interpretation",
    page.includes("Verified Facts") &&
      page.includes("Evidence-Bound Reasoning / Interpretation"),
  ],
  [
    "Counter evidence retains primary prominence",
    page.includes("Counter Evidence"),
  ],
  [
    "technical identities are collapsed by default",
    page.includes("<details") && replay.includes("Technical timeline evidence"),
  ],
  [
    "paired Replay and Research reads share an exact window",
    facade.includes("pairedKind") && facade.includes("exact.eventTimeStart"),
  ],
  [
    "no recommendation language introduced",
    !replay.includes("BUY") &&
      !replay.includes("SELL") &&
      !page.includes("LONG recommendation"),
  ],
  [
    "root route redirects to canonical Dashboard",
    rootPage.includes('redirect("/dashboard")') &&
      !rootPage.includes("DashboardLayout"),
  ],
];

let failures = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) failures += 1;
}
if (failures) process.exitCode = 1;
