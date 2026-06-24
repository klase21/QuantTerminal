# QuantTerminal Acceptance Criteria

Status: Canonical acceptance guide  
Audience: contributors and reviewers  

## Universal Acceptance Criteria

A feature is accepted only when:

- TypeScript validation passes.
- Relevant audits pass.
- No synthetic production data is introduced.
- Data Health passes when deployable artifacts or evidence freshness are touched.
- No known regression is introduced in protected flows.
- Documentation is updated when behavior, contracts, data sources, or operations change.
- Missing data produces explicit unavailable or no-data states.
- Runtime paths remain responsive and bounded.

## Required Validation Commands

Use the smallest relevant set:

```powershell
npx.cmd tsc --noEmit --pretty false --incremental false
npm run test:intelligence
npm run audit:data-health
npm run audit:deployable-snapshots
```

Never run `npm run build` unless the sprint explicitly allows it and repository
instructions permit it.

## Feature Acceptance Template

```markdown
## Acceptance

- Scope:
- Files changed:
- Runtime behavior:
- Data source:
- Synthetic data check:
- Unavailable-state behavior:
- Audits run:
- TypeScript result:
- Data Health result:
- Known limitations:
```

## Data Feature Template

```markdown
## Data Acceptance

- Source:
- Required fields:
- Rejected records:
- Artifact type:
- Snapshot generated:
- Coverage:
- Freshness:
- Health:
- Raw data committed: no
```

## UI Feature Template

```markdown
## UI Acceptance

- Primary user question:
- Conclusion visible first:
- Top reasons visible:
- Supporting evidence visible:
- Empty/loading/unavailable states:
- Mobile/layout risk:
- No unrelated redesign:
```

## Review Gate

Block acceptance when:

- A metric is fabricated.
- A page blocks on a heavy optional request.
- A cache miss triggers hidden historical computation.
- Generated evidence is presented as observed evidence.
- A feature bypasses artifact, health, or snapshot contracts.
- Documentation omits a new operational command or data contract.
