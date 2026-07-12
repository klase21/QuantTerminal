# Population Identities

```text
Job request identity != Job instance ID != Run ID != Unit ID
!= Retrieval Attempt ID != Raw Object/Manifest ID != Candidate ID
!= Canonical Record ID != Canonical Commit ID
```

Job request identity is deterministic from profile/version, dataset/provider, and ordered bounded dimensions. Schedule occurrence identity prevents duplicate scheduler delivery, while an explicit rerun identity permits intentional reruns.

Run identity includes Job and positive attempt number. Unit identity includes profile/version and only the dimensions declared by that dataset profile. Retrieval Attempt identity includes Unit, Run, and attempt number.

Candidate identity is deterministic from raw manifest identity, source observation identity, parser version, and bounded ordinal/source-event boundary. It excludes Worker, Run, and wall-clock execution time. Canonical Record and Commit identities remain D1/D2-owned.

Every retry reuses logical Job/Unit/Candidate identities where inputs are unchanged. A different scope, parser version, source observation, or raw manifest produces an explicit new identity rather than mutating the old object.
