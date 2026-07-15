import { readFileSync } from "node:fs";

const page = readFileSync("components/mvp-cutover/MvpCutoverPage.tsx", "utf8");
const prediction = readFileSync(
  "components/research-v2/PredictionMarketContextSection.tsx",
  "utf8",
);
const navigation = readFileSync(
  "components/layout/PrimaryNavigation.tsx",
  "utf8",
);

const checks: Array<readonly [string, boolean]> = [
  [
    "shared finance formatter used",
    page.includes("formatFundingRate") &&
      page.includes("formatDirectionalFlow") &&
      page.includes("formatPrice"),
  ],
  [
    "reason dictionary used",
    page.includes("humanReasonFor(code).label") &&
      page.includes("reason.explanation"),
  ],
  [
    "unknown reasons remain visible for QA",
    page.includes('reason.code === "UNMAPPED_REASON_CODE"'),
  ],
  ["raw card formatter removed", !page.includes("function formatNumber(")],
  [
    "duplicate card metadata removed",
    !page.includes("Coverage complete</Badge><Badge") &&
      !page.includes("Frozen corpus</Badge>"),
  ],
  [
    "prediction probability is deterministic",
    prediction.includes("formatProbability(value / 100)"),
  ],
  [
    "external context is non-blocking",
    page.includes("Daily supplemental observations") &&
      page.includes("Core crypto Evidence remains functional"),
  ],
  [
    "Farside is presented as persisted supplemental context",
    page.includes("formatEtfUsdMillions") &&
      page.includes("Daily observed flow from Farside") &&
      !page.includes("Farside ETF flow remains source blocked") &&
      !page.includes('source="Farside Bitcoin ETF Flow"\n              affectsConclusion={false}\n              detail="The public page is readable'),
  ],
  [
    "Intel hidden from primary navigation",
    !navigation.includes('href: "/historical-intelligence"'),
  ],
];

const failures = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks)
  process.stdout.write(`[${pass ? "PASS" : "FAIL"}] ${name}\n`);
if (failures.length) process.exitCode = 1;
