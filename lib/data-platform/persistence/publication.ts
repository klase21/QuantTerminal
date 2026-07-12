import type { PublicationDecisionType, PublicationState, PublicationTransition } from "./contracts"

const LEGAL_TRANSITIONS = Object.freeze({
  PENDING: Object.freeze(["CERTIFIED", "REJECTED"]),
  CERTIFIED: Object.freeze(["PUBLISHED", "REJECTED"]),
  PUBLISHED: Object.freeze(["SUPERSEDED", "REVOKED"]),
  SUPERSEDED: Object.freeze([]), REJECTED: Object.freeze([]), REVOKED: Object.freeze([]),
} as const satisfies Record<PublicationState, readonly PublicationState[]>)

const DECISION_FOR_TRANSITION: Readonly<Record<string, PublicationDecisionType>> = Object.freeze({
  "PENDING:CERTIFIED": "CERTIFY", "PENDING:REJECTED": "REJECT", "CERTIFIED:PUBLISHED": "PUBLISH",
  "CERTIFIED:REJECTED": "REJECT", "PUBLISHED:SUPERSEDED": "SUPERSEDE", "PUBLISHED:REVOKED": "REVOKE",
})

export function isLegalPublicationTransition(transition: PublicationTransition): boolean { return (LEGAL_TRANSITIONS[transition.from] as readonly PublicationState[]).includes(transition.to) }
export function publicationDecisionFor(transition: PublicationTransition): PublicationDecisionType | null { return isLegalPublicationTransition(transition) ? DECISION_FOR_TRANSITION[`${transition.from}:${transition.to}`] ?? null : null }
