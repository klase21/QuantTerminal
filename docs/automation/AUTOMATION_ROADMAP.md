# QuantTerminal Automation Roadmap

Status: roadmap foundation  
Scope: future milestones  
Runtime behavior: none

## Purpose

This roadmap defines the staged path from manual AI-assisted work toward controlled automation. Automation must not outrun review, validation, data correctness, or human approval.

## A1 Architecture

### Goal

Define the automation architecture, agent roles, task schema, and review protocol.

### Deliverables

- `docs/automation/AGENT_ARCHITECTURE.md`
- `docs/automation/AGENT_PROTOCOL.md`
- `docs/automation/TASK_SCHEMA.md`
- `docs/automation/REVIEW_PROTOCOL.md`
- `docs/automation/AUTOMATION_ROADMAP.md`
- placeholder automation directories

### Success Criteria

- architecture exists
- agent roles are defined
- task schema is documented
- review gates are documented
- no runtime code exists

## A2 Planner

### Goal

Implement a Planner Agent that converts user objectives into structured task JSON.

### Deliverables

- planner task generator
- schema validation
- required-reading resolution
- scope and forbidden-change extraction

### Success Criteria

- planner emits valid task schema
- ambiguous tasks are blocked rather than invented
- downstream agents can consume planner output

## A3 Screenshot Harness

### Goal

Create a controlled screenshot capture layer for UI certification.

### Deliverables

- viewport matrix
- route capture protocol
- screenshot metadata
- failure reporting

### Success Criteria

- desktop/tablet/mobile captures are reproducible
- failed route loads are explicit
- screenshots are attached to review output

## A4 Review Agent

### Goal

Implement the Review Agent using the review protocol.

### Deliverables

- constitution review
- design system review
- freeze rule review
- runtime review
- screenshot review
- final decision report

### Success Criteria

- review decisions are deterministic
- scope violations are caught
- validation gaps are flagged
- subjective redesigns do not bypass freeze

## A5 Telegram Approval

### Goal

Add a human approval gate for automation outcomes.

### Deliverables

- approval message format
- approval status capture
- reject reason capture
- approval audit log

### Success Criteria

- no merge proceeds without explicit approval
- approvals are timestamped
- blocking failures are visible to the approver

## A6 Auto Merge

### Goal

Enable merge automation after Planner, Worker, QA, Screenshot, Review, and Telegram Approval gates pass.

### Deliverables

- merge eligibility checks
- branch status checks
- final approval verification
- merge execution protocol

### Success Criteria

- only approved, validated changes merge
- failures stop the pipeline
- merge audit trail is complete

## Long-Term Guardrails

- Human approval remains required for merge.
- Production deployments remain separately gated.
- Data generation remains explicit and auditable.
- No agent may bypass validation.
- No agent may invent product requirements.

