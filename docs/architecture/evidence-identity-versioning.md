# Evidence Identity and Versioning

## Business Identity

Evidence business identity answers: "the same bounded evidence question or analytical object." Its canonical material contains subject identity/type, topic, Event-Time scope, Knowledge-Time mode/cutoff, assembly profile ID/version, and Evidence schema version.

It excludes Candidates, Results, Fact versions, execution timestamps, workers, database IDs, consumers, routes, generated prose, and confidence. A correction retains the business identity only when those analytical-question dimensions remain unchanged.

## Packet Version Identity

Packet version identity binds the business identity to exact Candidate identities, exact Result identities, inherited exact Fact versions/checksums/roles, assembly and selection policy versions, schema version, and immutable packet checksum. Inputs are canonically ordered before hashing.

Therefore:

- equivalent candidate ordering is identity neutral;
- changed Result or Fact version creates a new Packet version;
- changed Knowledge-Time, profile, policy, or schema binding creates a new identity;
- worker, attempt, insertion order, and execution timestamp do not affect identity.

The persistent `packet_id` represents business identity and can own multiple immutable `packet_version_id` rows. No incrementing revision number is authoritative. Old versions remain queryable and cannot be rewritten when a correction produces a later version.

## Outcomes

`REUSED` means an identical existing Packet satisfies a new assembly request. `DUPLICATE` means the same persistence command was repeated. `CONFLICT` means the same Packet version identity was submitted with incompatible immutable content; the original survives and an idempotent bounded conflict record is appended. No outcome selects a mutable "latest" row.
