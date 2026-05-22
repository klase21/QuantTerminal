"use client";

import MultiChartWorkspace from "@/components/MultiChartWorkspace";
import Orderbook from "@/components/Orderbook";
import FlowPanel from "@/components/right-panel/FlowPanel";
import Footprint from "@/components/Footprint";
import RotationSankeyGraph from "@/components/RotationSankeyGraph";
import LiquidityPanel from "@/components/right-panel/LiquidityPanel";
import LiquidityRotationPanel from "@/components/right-panel/LiquidityRotationPanel";
import RealtimeIntelligenceStrip from "@/components/macro/RealtimeIntelligenceStrip";
import ResearchReplayWorkspace from "@/components/research/ResearchReplayWorkspace";
import SignalInboxWorkspace from "@/components/product/SignalInboxWorkspace";
import SystemDiagnosticsWorkspace from "@/components/system/SystemDiagnosticsWorkspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExecutionWorkspaceProps = {
  orderbook: any;
  trades: any[];
  flow: any;
  footprint: any;
  frames: any[];
  liquidityEvents: any[];
};

export default function ExecutionWorkspace({
  orderbook,
  trades,
  flow,
  footprint,
  frames,
  liquidityEvents,
}: ExecutionWorkspaceProps) {
  return (
    <Tabs defaultValue="charts" className="flex h-full min-h-0 flex-col gap-4">
      <TabsList className="flex h-auto w-full shrink-0 flex-wrap justify-start gap-2 border-b border-zinc-800 bg-transparent p-0 pb-2">
        <TabsTrigger value="charts">Charts</TabsTrigger>
        <TabsTrigger value="orderflow">Order Flow</TabsTrigger>
        <TabsTrigger value="intelligence">Realtime Intel</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="research">Research</TabsTrigger>
        <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
      </TabsList>

      <TabsContent value="charts" className="m-0 min-h-0">
        <MultiChartWorkspace />
      </TabsContent>

      <TabsContent value="orderflow" className="m-0 min-h-0">
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_1.15fr]">
          <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40 p-2">
            <Orderbook bids={orderbook?.bids || []} asks={orderbook?.asks || []} />
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40">
            <div className="shrink-0 min-h-0 overflow-hidden">
              <FlowPanel trades={trades} flow={flow} />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden border-t border-zinc-900 p-2">
              <Footprint levels={footprint} />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="intelligence" className="m-0 min-h-0">
        <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-zinc-900 bg-black p-4">
          <RealtimeIntelligenceStrip />
        </div>
      </TabsContent>

      <TabsContent value="signals" className="m-0 min-h-0 overflow-y-auto pr-1">
        <SignalInboxWorkspace />
      </TabsContent>

      <TabsContent value="research" className="m-0 min-h-0 overflow-y-auto pr-1">
        <ResearchReplayWorkspace />
      </TabsContent>

      <TabsContent value="diagnostics" className="m-0 min-h-0 overflow-y-auto pr-1">
        <SystemDiagnosticsWorkspace />
      </TabsContent>

      <TabsContent value="liquidity" className="m-0 min-h-0">
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-2">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="shrink-0 overflow-hidden">
              <RotationSankeyGraph trades={trades} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <LiquidityPanel frames={frames} liquidityEvents={liquidityEvents} />
            </div>
          </div>

          <div className="h-full min-h-0 overflow-y-auto">
            <LiquidityRotationPanel trades={trades} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
