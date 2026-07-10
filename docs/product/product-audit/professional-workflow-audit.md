# Professional Workflow Audit

**Status:** Canonical F5.5 workflow audit  
**Owner:** Product / Professional Experience

## Evaluation Scale

- **READY:** coherent end-to-end workflow with clear ownership and evidence handoffs.
- **PARTIAL:** product contract is complete, but implementation or interaction validation remains.
- **BLOCKED:** a missing owner, evidence path, or critical dependency prevents safe use.

## Workflow Matrix

| Workflow | Canonical path | Efficiency | Context switching | Decision support | Status |
| --- | --- | --- | --- | --- | --- |
| Morning review | Dashboard -> Markets -> Scanner | Fast orientation, then live verification and triage | Two purposeful transitions | Strong evidence quality and next-step visibility | READY |
| Intraday monitoring | Markets -> Dashboard/Scanner -> Replay when needed | Real-time work remains separate from optional history | Context envelope prevents re-entry work | Strong, provided unavailable data remains local | READY |
| Incident investigation | Dashboard or Markets -> Replay -> Research -> Repository | Sequence before interpretation minimizes false causality | Bounded window and evidence IDs preserve focus | Strong support/counter-evidence chain | READY |
| Research workflow | Research -> Evidence -> Counter Evidence -> Replay -> Repository | Deep work is intentionally manual and source-led | Thesis and replay target preserve scope | Strong; AI conclusions remain gated | READY |
| Risk workflow | Markets -> Scanner -> Research -> future Trade | Market risk narrows to investigation and candidate risk | Domain risk remains explicit | Strong once Trade formalizes scenarios/invalidation | PARTIAL |
| Investment committee | Research -> Replay -> Evidence ledger -> future Trade -> export | Audit trail supports review | Shared context and Repository links support traceability | Product contract is strong; collaboration/export is future | PARTIAL |
| Post-event review | Replay -> Research -> Repository | Historical sequence is the entry point | Context remains bounded and auditable | Strong, with heavy orderbook evidence optional | READY |

## Workflow Findings

### Morning Review

Dashboard satisfies five-second orientation; Markets verifies breadth, flows, sectors, and derivatives; Scanner surfaces only eligible investigations. This avoids forcing professionals through deep analysis before identifying what matters.

### Intraday Monitoring

Markets remains real-time first. Replay is invoked only when investigation needs history. Optional heavy evidence cannot block the live workflow, preserving the repository rule `Responsiveness > Completeness`.

### Incident Investigation

Replay owns chronology, Research owns interpretation and contradiction, and Repository owns proof. This is the strongest unified workflow and should be the reference interaction model for Trade.

### Research and Committee Review

The evidence model supports due diligence, but saved collaborative packets, annotations, review state, and export governance are not yet canonical capabilities. Their absence does not block individual professional use.

### Risk and Trade Preparation

The upstream product already supplies candidate identity, evidence, uncertainty, source state, historical validation, and research context. Trade must add candidate-specific scenarios and invalidation without becoming order entry.

## Efficiency Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Reverse navigation may lose structured context in current implementation. | Minor | Complete shared-context handoffs and visible return trail. |
| Repeated source/status metadata can consume space. | Minor | Use consistent compact metadata rails and progressive disclosure. |
| Deep workflows may revisit the same fact on several screens. | Minor | Reuse evidence identity and vary depth, not meaning. |
| Optional orderbook reconstruction can exceed runtime budget. | Protected boundary | Keep unavailable/manual behavior; never block Replay. |

## Decision

**PASS WITH MINOR ACTIONS.** Core professional workflows are coherent and efficient. Collaboration/export and Trade decision organization remain planned product work, not architectural blockers.
