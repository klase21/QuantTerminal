# Screen Purpose Matrix

**Status:** Canonical screen ownership matrix  
**Owner:** Product / Design  

## Purpose

This matrix defines each screen's purpose, primary user, primary question,
success metric, dependencies, required evidence, and required navigation.

## Matrix

| Screen | Purpose | Primary User | Primary Question | Success Metric | Dependencies | Required Evidence | Required Navigation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Fast market orientation. | Beginner to professional. | What is happening and why should I care? | User understands primary market state within 5 seconds. | Evidence Cards, Markets, Replay, Research. | Market direction evidence, source/freshness, key drivers. | Markets, Replay, Research, Scanner, Trade. |
| Markets | Live monitoring and verification. | Intermediate, professional. | Which markets deserve attention? | User can verify live structure quickly. | Market data, derivatives data, source state. | Price, flows, derivatives, macro/prediction when available. | Scanner, Replay, Research, Trade. |
| Scanner | Opportunity discovery. | Intermediate, professional. | What changed and what needs attention? | User can triage candidates without fabricated confidence. | Signal/candidate sources, evidence, filters. | Candidate reason, source-backed confidence, freshness, status. | Trade, Replay, Research, Markets. |
| Trade | Execution support. | Intermediate, professional. | How should I evaluate this candidate? | User can see thesis, evidence, risk, and scenarios. | Selected candidate, Evidence Cards, Replay, Research. | Thesis evidence, risk, invalidation, historical analog if available. | Scanner, Markets, Replay, Research. |
| Replay | Historical movement explanation. | Intermediate, researcher, professional. | What happened in this historical window? | User can understand sequence without blocking on heavy data. | Repository coverage, bounded queries, evidence. | Price, funding, OI, liquidation, orderbook if safe, source state. | Dashboard, Research, Trade, Repository. |
| Research | Deep understanding. | Researcher, professional, enterprise. | Why should I believe this thesis, and what contradicts it? | User can inspect support, conflict, sources, and raw trail. | Evidence, Replay, Repository, future reasoning. | Supporting evidence, counter-evidence, charts, sources. | Replay, Trade, Dashboard, Repository. |
| Repository | Raw audit and source records. | Professional, researcher, enterprise. | What facts prove this? | User can audit source-backed records. | Repository facts, source governance, projection/coverage. | Raw records, source, timestamp, checksum/metadata where available. | Research, Replay, Evidence Cards. |
| Settings / Operations | Configuration and operational visibility. | Professional, admin, developer. | What is configured or operationally available? | User can inspect status without changing product truth. | Source health, preferences, operational docs. | Availability, source state, user settings. | All primary screens. |

## Ownership Rules

- Dashboard orients; it does not investigate deeply.
- Markets monitors; it does not own historical explanation.
- Scanner discovers; it does not execute.
- Trade supports; it does not decide for the user.
- Replay explains historical movement; it does not generate research conclusions.
- Research investigates; it does not fabricate missing evidence.
- Repository audits; it does not own first-read UX.

## Validation

No duplicated screen responsibility is allowed without product and architecture
review.
