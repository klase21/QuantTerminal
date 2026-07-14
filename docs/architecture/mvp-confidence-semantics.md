# MVP Confidence Semantics

MVP Confidence is governed evidence strength. It is not a probability of
future price direction, a trading recommendation, or a substitute for
Coverage.

The seven explicit components are:

- `dataCoverage`: minimum aligned required-input Coverage.
- `sourceQuality`: quality of the certified governed source path; provider tier remains separate.
- `temporalAlignment`: satisfaction of the no-future-data temporal policy.
- `ruleAgreement`: fraction of evaluable rules that triggered.
- `counterEvidencePenalty`: material opposing observations per evaluable rule.
- `freshness`: completeness of the governed bounded input window.
- `reproducibility`: deterministic inputs, versions, and checksums.

`HIGH`, `MEDIUM`, and `LOW` describe evidence strength only. `NOT_AVAILABLE`
is mandatory when the assessment is not evaluable. Counter evidence reduces
strength; it is not decorative. Optional Liquidation and Order Book absence is
disclosed but does not fabricate a penalty for required corpus inputs.

MVP-2 is an activation exercise, not statistical calibration. Threshold and
component calibration remains Phase V work.
