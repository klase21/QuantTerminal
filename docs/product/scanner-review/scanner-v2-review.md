# Scanner V2 Review

**Status:** Canonical product-design review  
**Sprint:** F5  
**Figma:** [QuantTerminal Scanner V2](https://www.figma.com/design/3roqtZ5Mt8QRgpvICV7Anf)  
**Baseline:** `components/scanner/ScannerPage.tsx`, Scanner opportunity route, and the existing Scanner design  
**Owner:** Product / Design

## Decision

Scanner V2 is approved as the canonical Opportunity Prioritization Workspace.
It evolves the current Scanner without changing polling, market-mover memory,
opportunity APIs, candidate retention, or product-context handoffs.

Scanner V2 prioritizes investigations. It does not sell signals, recommend a
trade, or turn missing evidence into a candidate.

## Product Questions

Scanner V2 must answer:

1. What deserves my attention?
2. Why?
3. How confident are we?
4. Which evidence supports this?
5. What should I investigate next?

Unsupported priority, confidence, direction, reason, freshness, or candidate
identity remains `UNAVAILABLE`.

## Existing Scanner Audit

| Existing section or behavior | Decision | Reason |
| --- | --- | --- |
| Scanner Summary | MODIFY | Becomes the evidence-gated Priority Queue summary with availability, freshness, coverage, and source state. |
| Inherited Markets context | KEEP | Preserves sector and market context while Scanner ranking remains independently source-backed. |
| Priority Opportunities | KEEP + MODIFY | Becomes the Priority Queue; ranking is displayed only with its method and evidence basis. |
| Signal Feed | REMOVE AS LABEL | Scanner is not a signal feed. Candidate rows become investigation records. |
| Opportunity Filters | KEEP | Filters remain essential for symbol, timeframe, direction state, source, freshness, status, and evidence coverage. |
| Priority Opportunity Card | KEEP + MODIFY | Becomes the canonical Opportunity Card with evidence, counter-evidence, risk, freshness, coverage, and next step. |
| Confidence display | KEEP WITH BOUNDARY | Confidence is source-backed or unavailable; no fallback to score text. |
| Direction normalization | MODIFY | Missing direction must remain unavailable. It must not default to neutral or be inferred from wording. |
| Setup fallback | MODIFY | Missing setup/reason must remain unavailable. Generic labels such as `Live Market Signal` are not canonical evidence. |
| Derived grade from score | REMOVE | Grade thresholds are local interpretation and duplicate priority. Use the source-backed priority contract only. |
| Tradeable summary | REMOVE | Tradeability is Trade ownership and overstates Scanner responsibility. Replace with active investigations. |
| High Confidence summary | MODIFY | Count only candidates with valid source-backed confidence and method. |
| Candidate retention / aging | KEEP | Active and aging states support surveillance when freshness remains explicit. |
| Markets links | KEEP | Markets verifies current structure. |
| Replay links | KEEP | Replay validates bounded historical behavior. |
| Research handoff | KEEP + ELEVATE | Research receives candidate identity, source reason, evidence, conflict, confidence state, and freshness. |
| Trade links | KEEP AS OPTIONAL | Trade is available only after user selection; it is not Scanner's default call to action. |
| Repository availability | ADD | Candidate and evidence records must remain auditable. |
| Risk layer | ADD | Counter-evidence, missing data, coverage gaps, alternatives, and low-confidence warnings become mandatory. |

The fallback and derived-label findings above are implementation observations,
not runtime changes in F5.

## Information Hierarchy Validation

| Level | Scanner V2 treatment | Status |
| ---: | --- | --- |
| 1. Priority Queue | Evidence-gated queue with priority, identity, confidence, freshness, coverage, evidence count, status, and Repository state. | PASS |
| 2. Opportunity Cards | One selected investigation with headline, summary, evidence, counter-evidence, risk, and next step. | PASS |
| 3. Supporting Evidence | Ten canonical evidence categories with explicit availability. | PASS |
| 4. Risk Factors | Mandatory disagreement, missing data, gaps, alternatives, and low-confidence warnings. | PASS |
| 5. Suggested Investigation Path | Markets -> Replay -> Research -> Repository -> optional Trade. | PASS |
| 6. Related Replay | Bounded historical validation handoff. | PASS |
| 7. Related Research | Evidence and contradiction review handoff. | PASS |
| 8. Repository | Candidate and evidence audit trail. | PASS |

## Canonical Layout

```text
Global navigation + search/filter toolbar
  -> Priority Queue
  -> Selected Opportunity Card
  -> Supporting Evidence
  -> Risk Factors
  -> Suggested Investigation Path
  -> Related Replay + Research + Repository
  -> Investigation Timeline + policy + context contract
```

## Priority Queue Contract

Every queue record includes:

- deterministic candidate identity;
- priority score and scoring basis;
- confidence and method;
- freshness;
- coverage;
- verified evidence count;
- investigation status;
- Repository availability.

A score without its evidence basis, confidence method, freshness, and coverage
is unavailable. Queue position must not be fabricated to make Scanner look
active.

## Opportunity Card Contract

Every selected opportunity exposes:

- source-backed headline and summary;
- supporting evidence;
- counter-evidence;
- confidence;
- freshness;
- risk level;
- coverage;
- suggested investigation step;
- Replay, Research, and Repository destinations.

Missing direction or reason remains unavailable. Scanner does not construct a
setup narrative from symbol movement alone.

## Evidence Categories

| Category | Canonical rule |
| --- | --- |
| Market Structure | Must come from source-backed market context. |
| Funding | Missing funding never implies neutral leverage. |
| Open Interest | Requires symbol, source, and observation time. |
| Liquidations | Requires factual events or bars and provider tier. |
| ETF | Requires source-backed flow evidence. |
| Macro | Requires governed source and timestamp. |
| Prediction Markets | Probability is evidence, not platform prediction. |
| On-chain | Requires approved chain/entity evidence. |
| Exchange | Requires observed exchange evidence. |
| Research | Requires an attributable research source or record. |

No category contributes to evidence count until its observation, timestamp,
source, availability, and candidate relationship validate.

## Risk Rules

- Counter-evidence is mandatory.
- Missing data and coverage gaps are first-class risk objects.
- Alternative explanations remain visible.
- Low-confidence warnings cannot be suppressed by priority.
- Absence of counter-evidence does not mean none exists.
- Missing evidence is a reason to investigate, not a reason to rank.

## Investigation Path

| Step | Owner | Purpose |
| ---: | --- | --- |
| 1 | Markets | Verify current live structure. |
| 2 | Replay | Check bounded historical behavior. |
| 3 | Research | Review evidence, contradiction, and sources. |
| 4 | Repository | Audit candidate and evidence facts. |
| 5 | Trade | Optional user-led planning after investigation. |

Trade is not the default destination and Scanner never recommends execution.

## Professional Workflow Validation

| Workflow | Scanner V2 path | Result |
| --- | --- | --- |
| Morning review | Queue state -> freshness/coverage -> top verified investigation | Supported |
| Market surveillance | Filters -> active/aging records -> Markets verification | Supported |
| Research discovery | Opportunity -> evidence/gaps -> Research | Supported |
| Risk discovery | Priority -> counter-evidence -> missing data -> Repository | Supported |
| Opportunity discovery | Markets context -> queue -> investigation path | Supported |
| Institutional workflow | Identity -> evidence method -> review timeline -> audit | Supported |

## Cross-Navigation Contract

Scanner accepts context from Markets, Dashboard, alerts, and search. It routes
to Markets, Replay, Research, Repository, Dashboard, and optional Trade.

Handoffs preserve candidate ID, symbol, timeframe, source direction,
confidence state, evidence IDs, risk state, freshness, coverage, and source
reason when available.

## Competitive Benchmark

| Product | Prioritization | Evidence quality | Professional workflow | Navigation | Decision support | Scanner V2 assessment |
| --- | --- | --- | --- | --- | --- | --- |
| TradingView Screener | Excellent filtering | Primarily metric-based | Strong | Excellent chart handoff | User-led | Scanner V2 is stronger in evidence and risk; TradingView remains stronger in filter depth and customization. |
| CoinGlass | Strong derivatives ranking | Strong liquidation/OI context | Strong | Dataset-centric | Metric-led | Scanner V2 adds investigation paths and counter-evidence; CoinGlass remains a derivatives scan benchmark. |
| CryptoQuant | Metric alerts and presets | Strong methodology | Strong analyst workflow | Research-centric | Evidence-led | Scanner V2 has clearer cross-product ownership; CryptoQuant retains deeper mature datasets. |
| Arkham | Entity/flow alerts | Excellent traceability | Strong investigation | Excellent graph handoff | Evidence-led | Scanner V2 matches audit discipline; Arkham remains stronger in entity relationships. |
| Nansen | Smart-money labels and alerts | Strong labeled evidence | Strong institutional workflow | Entity-centric | Discovery-led | Scanner V2 is differentiated by mandatory uncertainty; Nansen remains stronger in wallet/entity coverage. |

QuantTerminal's differentiation is not a higher number of signals. It is a
traceable queue that shows why attention is warranted, what is missing, what
contradicts it, and which owning workflow should investigate next.

## Visual and Interaction Review

- Dashboard V2 visual language and state terminology are preserved.
- Markets V2 supplies live context without controlling Scanner priority.
- Replay V2 supplies bounded validation.
- Research V2 supplies evidence and mandatory disagreement.
- Amber denotes attention and prioritization, green denotes safe investigation
  routes, cyan denotes source/evidence metadata, and red denotes unresolved
  risk.
- Every color has a textual state label.
- No opportunity card contains a fictional symbol, setup, score, or reason.
- The queue remains dense and fast without becoming a ticker or signal feed.

## Ownership Boundaries

- Scanner owns discovery, triage, and investigation priority.
- Markets owns live structure.
- Replay owns historical reconstruction.
- Research owns deep evidence and contradiction review.
- Trade owns execution planning.
- Repository owns candidate and evidence facts.

## Current Runtime Boundaries Preserved

- Market mover polling and active setup memory remain unchanged.
- Scanner opportunity polling remains unchanged.
- Candidate retention and aging remain unchanged.
- Markets-to-Scanner and Scanner-to-Research context paths remain unchanged.
- No providers, APIs, runtime, scoring logic, or UI implementation changed in
  F5.

## Limitations

- The Figma artifact uses unavailable states because no source-backed Scanner
  payload was supplied to this design sprint.
- Priority methodology normalization remains implementation work.
- Repository candidate availability is not yet wired into the current page.
- Investigation history and saved queues remain future capabilities.
- No interactive Figma prototype behavior is wired yet.

## Validation

| Check | Result |
| --- | --- |
| PDGM-104 alignment | PASS |
| Scanner Information Architecture alignment | PASS |
| Dashboard V2 visual alignment | PASS |
| Markets V2 context alignment | PASS |
| Replay V2 investigation alignment | PASS |
| Research V2 evidence/risk alignment | PASS |
| Priority is evidence-gated | PASS |
| Counter-evidence preserved | PASS |
| Repository reachable | PASS |
| Professional workflows represented | PASS |
| No duplicated page responsibility | PASS |
| No trade recommendation or fabricated candidate | PASS |

