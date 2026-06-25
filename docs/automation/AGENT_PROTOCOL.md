# QuantTerminal Automation Agent Protocol

Status: protocol foundation  
Scope: coordination rules only  
Runtime behavior: none

## Purpose

This protocol defines how automation agents coordinate work in QuantTerminal. The protocol keeps future automation deterministic, reviewable, and aligned with the project constitution.

## Protocol Principles

1. Human intent starts the workflow.
2. Planner Agent converts intent into a bounded task.
3. Codex Worker executes only the approved task.
4. QA Agent verifies requirement coverage.
5. Screenshot Agent provides visual evidence when UI is touched.
6. Review Agent decides pass/fail.
7. Telegram Approval Agent requests explicit human approval before future automated merge.

## Required Context

Every agent must load or receive:

- task objective
- scope
- constraints
- forbidden changes
- validation requirements
- expected output
- relevant constitution documents
- current repository status when applicable

## Handoff Contract

Each handoff must include:

- stage name
- input artifact
- output artifact
- status
- warnings
- errors
- timestamp

## Stage Status Values

- `pending`
- `running`
- `passed`
- `failed`
- `blocked`
- `skipped`

## Failure Rules

- Failed validation stops the workflow unless the task explicitly allows partial completion.
- Missing screenshots block UI acceptance when screenshot review is required.
- Missing human approval blocks merge automation.
- Runtime code changes outside task scope block acceptance.
- Synthetic data blocks acceptance.

## Auditability Rules

Automation must leave enough evidence for a human reviewer to answer:

- What changed?
- Why did it change?
- Which constraints were active?
- Which validation ran?
- What failed?
- Who or what approved the result?

## Protected Areas

Agents must treat these as protected unless the task explicitly scopes them:

- websocket infrastructure
- realtime market infrastructure
- Replay runtime
- cache foundations
- intelligence algorithms
- scheduler behavior
- production artifact stores
- Dashboard frozen sections

## Approval Gates

Future automation must use explicit approval gates for:

- merge
- deployment
- scheduler changes
- production data generation
- external messaging
- any operation that transmits secrets or private data

## Non-Goals

This protocol does not implement:

- queues
- APIs
- database storage
- Telegram bot runtime
- autonomous merge
- agent memory

