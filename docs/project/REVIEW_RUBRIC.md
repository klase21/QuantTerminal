# QuantTerminal Review Rubric

Status: Canonical product review rubric  
Scoring: 1 to 5  

## Score Interpretation

| Score | Meaning |
| ---: | --- |
| 1 | Fails the page purpose or creates decision risk |
| 2 | Partially works but is confusing, fragile, or noisy |
| 3 | Usable but needs hierarchy, clarity, or reliability work |
| 4 | Strong and production-usable with minor gaps |
| 5 | Excellent, clear, resilient, and aligned with product principles |

## Dashboard Rubric

Questions:

- Can a user understand market state within five seconds?
- Can a user identify the top drivers?
- Can a user identify supporting evidence?
- Can a user act on the information without reading raw analytics?
- Are stale, missing, and unavailable states explicit?

Score dimensions:

- Clarity
- Actionability
- Evidence quality
- Responsiveness
- Information hierarchy

## Markets Rubric

Questions:

- Does the page verify the selected symbol's live market structure?
- Are funding, OI, liquidation, price, and orderflow states clear?
- Are missing source conditions explicit?
- Does switching symbols avoid stale carryover?

Score dimensions:

- Real-time correctness
- Symbol consistency
- Data-state clarity
- Navigation responsiveness

## Scanner Rubric

Questions:

- Are candidates ranked and readable quickly?
- Are candidate reasons visible without overexplaining?
- Do candidates persist through transient refresh gaps?
- Is stale or aging state handled calmly?

Score dimensions:

- Discovery quality
- Stability
- Reason clarity
- Noise control

## Trade Rubric

Questions:

- Does selected candidate drive the execution plan?
- Are invalidation and evidence visible?
- Does navigation from Scanner preserve context?
- Are unsupported plans clearly unavailable?

Score dimensions:

- Selection integrity
- Plan clarity
- Evidence traceability
- Workflow continuity

## Research Rubric

Questions:

- Does the workflow feel like a continuous investigation?
- Are historical context, event impact, market memory, and evidence connected?
- Are manual-load historical systems clearly labeled?
- Does Research avoid becoming a raw data dump?

Score dimensions:

- Investigation continuity
- Evidence depth
- Context preservation
- Cognitive load

## Replay Rubric

Questions:

- Does Replay explain what happened in a selected window?
- Are chart, liquidation, OI, funding, and optional orderbook states clear?
- Does missing orderbook evidence fail gracefully?
- Does Replay avoid blocking on heavy datasets?

Score dimensions:

- Responsiveness
- Evidence quality
- Window integrity
- Failure handling

## Review Output Template

```markdown
## Review

Page:
Score:

Findings:
- Severity:
  Evidence:
  Recommended fix:

Acceptance risk:
```
