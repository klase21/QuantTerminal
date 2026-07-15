import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("components/mvp-cutover/MvpCutoverPage.tsx", "utf8");
const navigation = readFileSync("components/layout/PrimaryNavigation.tsx", "utf8");
const replay = readFileSync(
  "components/mvp-cutover/ReplaySequenceExperience.tsx",
  "utf8",
);

assert.match(
  page,
  /mr-auto grid w-full max-w-\[1660px\] gap-4.*data-governed-workspace/,
  "governed workspace must use right-auto wide-desktop geometry",
);
assert.doesNotMatch(
  page,
  /mx-auto grid max-w-\[1210px\]/,
  "governed workspace must not retain the centered 1210px canvas",
);
assert.match(
  navigation,
  /xl:pl-\[190px\]/,
  "desktop shell must reserve exactly the dominant 190px navigation rail",
);
assert.match(
  page,
  /xl:px-5/,
  "desktop content gutter must resolve to 20px after the navigation rail",
);

assert.match(page, /grid-cols-\[9rem_11rem_9rem_9\.5rem_8rem_8rem_11rem_9rem_max-content\]/);
assert.match(page, /role="columnheader"/);
assert.match(page, /min-w-\[1450px\]/);
assert.match(page, /w-max max-w-max[\s\S]*justify-start/);
assert.doesNotMatch(page, /2xl:justify-end/);
assert.match(
  page,
  /Observed through[\s\S]*formatUtcDate\(macroProjection\.eventTimeEnd\)/,
);
assert.match(page, /FRED DGS10 · ALPHA VANTAGE SPY/);
assert.match(
  page,
  /Daily context does not recompute the governed crypto conclusion\./,
);

assert.match(page, /data-trade-decision-workspace/);
for (const section of [
  "01 / Decision Summary",
  "02 / Evidence Workspace",
  "03 / Supporting Reasoning",
  "04 / Scenario Analysis",
  "05 / Risk Assessment",
  "06 / Execution Plan",
  "07 / Investigation Handoffs",
]) {
  assert.ok(page.includes(section), `Trade section missing: ${section}`);
}
assert.ok(page.includes("Decision Readiness"));
assert.ok(page.includes("Risk Ledger"));

assert.match(page, /data-research-evidence-workspace/);
for (const section of [
  "Evidence Category Matrix",
  "Evidence Readiness",
  "03 / Primary Sources",
  "Research Relationship Graph",
  "Related Research",
  "Repository Audit",
]) {
  assert.ok(page.includes(section), `Research region missing: ${section}`);
}

assert.ok(page.includes("Opportunity Metadata Rail"));
assert.ok(page.includes("03 / Supporting Evidence Grid"));
assert.ok(page.includes("05 / Suggested Investigation Path"));
assert.match(page, /xl:grid-cols-\[minmax\(0,1\.45fr\)_minmax\(22rem,0\.55fr\)\]/);

assert.ok(replay.includes("w-full"));
assert.ok(replay.includes("Primary Evidence Timeline"));
assert.ok(replay.includes("FundingLane"));

console.log("MVP-6D wide-desktop structure suite passed");
