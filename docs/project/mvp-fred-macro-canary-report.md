# MVP FRED Macro Canary Report

## Result

`CERTIFIED_BOUNDED_CANARY`

The official FRED API returned DGS10 metadata and 62 complete daily
observations in the bounded MVP window. Metadata identified the 10-year
constant-maturity Treasury market yield, Percent units, Daily frequency, and
Not Seasonally Adjusted status. The response retained FRED realtime metadata.

## Persistence

- Raw Artifact: 1 verified object, 7,489 bytes
- Raw Artifact checksum: `4c1121627cb2950c942f4bc0be5458d50cd5497106800d90fc7c3bc3ba48715b`
- Canonical Facts: 62 `MACRO_ECONOMIC_OBSERVATION` versions
- Publication: 62 `PENDING`
- Lineage edges: 62
- Coverage decisions: 1 eligible bounded decision
- Terminal Units: 1
- Active leases after execution: 0

The Artifact identity is content-derived. The report intentionally omits local
storage paths and credential-bearing request URLs.

## Exact Rerun

The exact rerun resolved as `RERUN_DUPLICATE`: 62 Candidate duplicates, 62
Fact duplicates, and 62 submission duplicates. Raw, Fact, lineage, Coverage,
Job, Unit, and lease counts were unchanged. No conflict was created.

## Limitation

This certifies DGS10 only. Other registered FRED roles require their own bounded
metadata and observation certification before they can appear as available.
