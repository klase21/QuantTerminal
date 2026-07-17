# MVP Commit-Bearing Resume Certification

The MVP-8A.2Q certification uses short-lived local PostgreSQL databases and unique non-login roles. Integrated D2/D3 use separate schemas and roles in one disposable database. D4, refresh control, and serving use separate disposable databases. A disposable object root is created outside the repository.

The first scenario commits one logical slot, execution attempt, fence-1 lease, Retrieval, Raw Object, Candidate, Canonical Fact, downstream chain, watermark, and withheld manifest. Resume creates a distinct execution attempt with fence 2 while retaining the Logical Slot ID and reusing all immutable records. Two exact resume repetitions insert no duplicate immutable rows.

A cross-slot result is rejected before downstream progression. An injected post-write mismatch commits one sanitized failure event and one checkpoint, releases its lease, preserves immutable evidence, and creates no downstream row. Inspection found one logical slot, one Retrieval, one Raw Object, one Candidate, one Fact, and zero active leases.

Cleanup runs in `finally`. The disposable object root, all disposable databases, and all disposable roles were removed. A subsequent catalog check found zero certification databases and zero certification roles.

