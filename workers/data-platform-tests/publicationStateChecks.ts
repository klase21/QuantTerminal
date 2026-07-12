import { isLegalPublicationTransition, publicationDecisionFor, type PublicationState } from "@/lib/data-platform/persistence"
const states: readonly PublicationState[] = ["PENDING", "CERTIFIED", "PUBLISHED", "SUPERSEDED", "REJECTED", "REVOKED"]
export const legalTransitionsPass = [
  ["PENDING", "CERTIFIED"], ["PENDING", "REJECTED"], ["CERTIFIED", "PUBLISHED"],
  ["CERTIFIED", "REJECTED"], ["PUBLISHED", "SUPERSEDED"], ["PUBLISHED", "REVOKED"],
].every(([from, to]) => isLegalPublicationTransition({ from: from as PublicationState, to: to as PublicationState }))
export const illegalTransitionsFail = states.every((from) => states.every((to) => {
  const expected = ["PENDING:CERTIFIED", "PENDING:REJECTED", "CERTIFIED:PUBLISHED", "CERTIFIED:REJECTED", "PUBLISHED:SUPERSEDED", "PUBLISHED:REVOKED"].includes(`${from}:${to}`)
  return isLegalPublicationTransition({ from, to }) === expected
}))
export const decisionsResolve = publicationDecisionFor({ from: "PUBLISHED", to: "SUPERSEDED" }) === "SUPERSEDE"
