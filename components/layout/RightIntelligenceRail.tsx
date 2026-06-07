"use client";

import RightPanelTabs from "@/components/right-panel/RightPanelTabs";

type RightIntelligenceRailProps = {
  trades: any[];
  liquidations: any[];
  frames: any[];
  absorptionEvents: any[];
  liquidityEvents: any[];
  flow: any;
};

export default function RightIntelligenceRail({
  trades,
  liquidations,
  frames,
  absorptionEvents,
  liquidityEvents,
  flow,
}: RightIntelligenceRailProps) {
  return (
    <RightPanelTabs
      trades={trades}
      liquidations={liquidations}
      frames={frames}
      absorptionEvents={absorptionEvents}
      liquidityEvents={liquidityEvents}
      flow={flow}
    />
  );
}
