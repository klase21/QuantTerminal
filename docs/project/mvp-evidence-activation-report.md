# MVP-2 Evidence Activation Report

## Result

MVP-2 evaluated 84 real daily windows across BTCUSDT, ETHUSDT, SOLUSDT,
BNBUSDT, XRPUSDT, and DOGEUSDT. D4 persisted 420 immutable Consistency Results,
84 Core Evidence Packets, and 84 structured market assessments with no
conflicts. The Evidence Corpus checksum is
`52043bcaf96ae62ff45c2eff6f814832fd3c12becf6869ea2308f36b656eb00c`.

| Market state | Windows |
| --- | ---: |
| NEUTRAL | 49 |
| DELEVERAGING | 15 |
| POSITIONING_EXPANSION | 9 |
| FUNDING_PRESSURE | 9 |
| DERIVATIVES_OVERHEATING | 1 |
| MIXED | 1 |

The certification day classified BTCUSDT as DELEVERAGING, DOGEUSDT as
FUNDING_PRESSURE, and ETHUSDT, SOLUSDT, BNBUSDT, and XRPUSDT as NEUTRAL. All
six assessments retain full required Coverage, source lineage, supporting and
counter evidence, explicit non-trigger reasons, and seven Confidence
components.

## Persistence And Recompute

D4 migration `009_mvp_evidence_activation.sql` adds an immutable structured
assessment table linked one-to-one to a Core Evidence Packet version. D4's
isolated dependency foundation was aligned through D2 migration 008 before D4
009 was applied; the integrated D2/D3 population database was read-only.

The exact recomputation reused all 420 Results and all 84 packets and returned
DUPLICATE for all 84 assessments. The generated Evidence Corpus checksum was
identical. Live verification reports 84 assessments, 84 packets, 420 Results,
six instruments, and zero conflicts.

## Boundaries

The evaluation is retrospective and uses no input Event Time at or beyond its
window end. It does not emit BUY, SELL, LONG, or SHORT recommendations.
Liquidation and Order Book are optional enrichment. D2 publication remains
PENDING, no Consumer Projection exists, and no page or API was changed.
