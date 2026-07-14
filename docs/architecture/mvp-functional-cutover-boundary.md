# MVP Functional Cutover Boundary

Projection generation, Projection exposure, and D2 source publication are separate truths. MVP-4 adds append-only D4 exposure decisions without changing Projection payloads.

`CUTOVER` makes the governed Projection corpus effectively `CONSUMER_VISIBLE`. `ROLLBACK` restores `READY_FOR_CUTOVER`; pages may then invoke their retained legacy component only as an explicit rollback path. A read error, missing Projection, checksum failure, or withheld Projection never activates legacy data.

Decision identity and checksum bind corpus ID/checksum, action, effective state, prior decision, reason, actor, and timestamp. Invalid decision rows are retained and explicitly invalidated by a second immutable ledger. The latest valid decision controls exposure.

Final MVP-4 state:

- D2 source publication: `PENDING`
- Projection lifecycle: `GENERATED`
- Stored Projection exposure: `READY_FOR_CUTOVER`
- Effective selected-corpus exposure: `CONSUMER_VISIBLE`
- Pages and API: Projection-backed
- Legacy components: rollback-only

