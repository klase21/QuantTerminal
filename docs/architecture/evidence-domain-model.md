# Evidence Domain Model

## Boundary

Canonical D4 Evidence is a structured, consumer-neutral derived artifact over exact D2 fact versions and reusable Consistency Results. It is not the protected legacy coverage packet in lib/evidence.

## Evidence Candidate

An immutable proposal containing deterministic candidate identity, Profile ID/version, subject, event window, knowledge mode/cutoff, ordered exact fact references, Result references, coverage/freshness/quality references, support/conflict references, missing/unsupported/inapplicable requirements, and assembly policy/schema versions.

A Candidate is not published. Eligibility requires valid immutable bindings, complete lineage, profile completeness evaluation, visible conflicts, and no blocking policy result.

## Evidence Packet

An immutable Packet version contains stable Evidence identity, Packet ID/version, Profile ID/version, subject/window, knowledge mode/cutoff, status/publication state, exact fact references, supporting and conflicting evidence, missing/unsupported/inapplicable requirements, Result references, separate coverage/freshness/quality/uncertainty summaries, governed confidence components, explanation codes, lineage root, assembly policy/schema versions, creation time, and supersession.

Packets contain no investment action. Structured fields are authoritative; prose is optional presentation.

~~~mermaid
flowchart LR
  F["Exact Fact Versions"] --> C["Evidence Candidate"]
  R["Consistency Results"] --> C
  Q["Coverage / Freshness / Quality"] --> C
  C --> G{"Eligibility Gate"}
  G -->|eligible| P["Immutable Packet Version"]
  G -->|blocked| B["Blocked Candidate + Reasons"]
  P --> H["Publication Handoff"]
~~~

## Evidence Categories

| Category | Meaning |
|---|---|
| Supporting | Compatible with a bounded description or hypothesis |
| Conflicting | Materially contradicts it and remains visible |
| Missing | Required by policy but unavailable |
| Inapplicable | Dataset does not apply |
| Unsupported | Governed capability/source is unavailable |

Missing is not absence. Unsupported is not zero. Absence requires an explicit complete-observation contract.

## Profiles

A Profile is a versioned assembly recipe declaring input roles, eligible datasets, Rules, temporal alignment, completeness, and publication policy. Initial candidates for later approval are Market State, Market Move Context, Replay Event Context, Sector Context, and Macro/ETF Context. Listing does not approve a Profile.

Scanner and Trade initially consume projections over core packets. Consumer-specific packets are avoided unless a domain requirement cannot be represented by a core Profile.

## Identity and Versioning

Evidence Business Identity leads to stable Packet ID, then positive Packet Version, then immutable physical row.

Identity derives deterministically from ordered, length-delimited Profile, subject, bounded event window, applicable scenario/hypothesis, and knowledge mode dimensions. Generated prose is excluded.

Changed fact versions, Results, Profile recipe, assembly policy, or governed evaluations create new versions. Different subject/window/Profile/mode creates a new identity. Identical ordered inputs/checksum are duplicate; incompatible immutable content at the same boundary is conflict.

~~~mermaid
flowchart TD
  F1["Fact V1"] --> E1["Packet V1"]
  F2["Fact V2 corrects V1"] --> R2["New Results"]
  R2 --> E2["Packet V2"]
  E1 -. "immutable/queryable" .-> E2
  E2 --> S["V1 superseded only after V2 publication"]
~~~

## Hypothesis Boundary

Fact leads to Consistency Result, then Evidence, Interpretation, and Hypothesis. A Hypothesis has separate identity/version, bounded statement code, support/conflict references, uncertainty, status, and policy/model version. It is never a fact.

## Consumer Use

One Core Packet feeds bounded consumer projections. Dashboard summarizes; Replay applies historical modes; Research exposes sources/conflicts; Markets groups context; Scanner prioritizes investigation; Trade organizes a human decision. Projections cannot alter Packet truth.
