# Consistency Result Selection

Selection is an immutable decision, never a Result mutation. Candidates bind a subject and immutable Result. Eligibility requires matching subject, Event-Time window, Knowledge-Time mode, cutoff, optional Rule-version policy, exact input knowledge availability, and explicit supersession policy.

Eligible candidates are ordered by exact Fact record version and deterministic Result identity, not creation time. `AS_KNOWN_THEN` cannot select a Result whose inputs were unavailable at the cutoff. Explicitly superseded Results may be rejected for a current query while remaining eligible for a historical policy that does not mark them superseded.

The decision records selected Result, rejected Results, bounded reason codes, policy version, Knowledge-Time binding, checksum, and creation time. Decisions are append-only and idempotent.
