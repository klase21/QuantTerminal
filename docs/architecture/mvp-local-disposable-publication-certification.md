# MVP Local Disposable Publication Certification

MVP-8L adds an explicit `LOCAL_DISPOSABLE_CERTIFICATION` target kind for inactive Serving publication. It is accepted only when the process declares the certification mode and the connection matches the exact loopback host, assigned port, database name, role, and sanitized target fingerprint recorded for a newly created disposable PostgreSQL 16 resource.

The mode does not relax managed target validation. Arbitrary localhost databases, wrong ports, non-MVP-8L database names, source aliases, and the former `127.0.0.2` strategy fail closed.

Disposable and managed publication share one persistence order: candidate/genesis corpus, Projection payloads, Evidence payloads, Replay payloads, immutable members, and the bound manifest. A separate read-only connection fingerprints exposure state before and after publication. The writer never receives privileges on `serving_exposure`.

Certification uses the actual approved MVP-8I candidate, exact checksums, and current explicit-candidate readers. The disposable target is deleted after certification and is never a publication source.
