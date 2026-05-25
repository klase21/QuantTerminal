"use client";

import { useState } from "react";

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
import NarrativeIntelligenceSurface from "@/components/narrative/NarrativeIntelligenceSurface";
import MarketStructureIntelligenceSurface from "@/components/market-structure/MarketStructureIntelligenceSurface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExecutionWorkspaceProps = {
  orderbook: any;
  trades: any[];
  flow: any;
  footprint: any;
  frames: any[];
  liquidityEvents: any[];
};

type ToolMode = "intel" | "liquidity" | "structure" | "research" | "diagnostics";

const toolModes: { id: ToolMode; label: string; hint: string }[] = [
  { id: "intel", label: "Realtime Intel", hint: "macro/news pulse" },
  { id: "liquidity", label: "Liquidity", hint: "rotation + events" },
  { id: "structure", label: "Structure", hint: "market regime" },
  { id: "research", label: "Research", hint: "replay + memory" },
  { id: "diagnostics", label: "Diagnostics", hint: "runtime health" },
];

function ToolModeButton({ active, label, hint, onClick }: { active: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-cyan-300/50 bg-cyan-500/10 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,.12)]"
          : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      <div className="text-xs font-black uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-70">{hint}</div>
    </button>
  );
}

export default function ExecutionWorkspace({
  orderbook,
  trades,
  flow,
  footprint,
  frames,
  liquidityEvents,
}: ExecutionWorkspaceProps) {
  const [toolMode, setToolMode] = useState<ToolMode>("intel");

  return (
    <Tabs defaultValue="narrative" className="flex h-full min-h-0 flex-col gap-4">
      <TabsList className="grid h-auto w-full shrink-0 grid-cols-2 gap-2 rounded-2xl border border-zinc-900 bg-black/70 p-2 md:grid-cols-5">
        <TabsTrigger value="narrative" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-100">Narrative Command</TabsTrigger>
        <TabsTrigger value="charts">Charts</TabsTrigger>
        <TabsTrigger value="flow">Flow</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="tools">More Tools</TabsTrigger>
      </TabsList>

      <TabsContent value="narrative" className="m-0 min-h-0 overflow-y-auto pr-1">
        <NarrativeIntelligenceSurface />
      </TabsContent>

      <TabsContent value="charts" className="m-0 min-h-0">
        <MultiChartWorkspace />
      </TabsContent>

      <TabsContent value="flow" className="m-0 min-h-0">
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

      <TabsContent value="signals" className="m-0 min-h-0 overflow-y-auto pr-1">
        <SignalInboxWorkspace />
      </TabsContent>

      <TabsContent value="tools" className="m-0 min-h-0 overflow-y-auto pr-1">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="px-2 pb-3 text-[10px] font-black uppercase tracking-[0.32em] text-zinc-500">Secondary Layer</div>
            <div className="grid gap-2">
              {toolModes.map((mode) => (
                <ToolModeButton key={mode.id} active={toolMode === mode.id} label={mode.label} hint={mode.hint} onClick={() => setToolMode(mode.id)} />
              ))}
            </div>
          </aside>

          <section className="min-h-[720px] overflow-hidden rounded-3xl border border-zinc-900 bg-black p-4">
            {toolMode === "intel" ? <RealtimeIntelligenceStrip /> : null}
            {toolMode === "research" ? <ResearchReplayWorkspace /> : null}
            {toolMode === "diagnostics" ? <SystemDiagnosticsWorkspace /> : null}
            {toolMode === "structure" ? <MarketStructureIntelligenceSurface /> : null}
            {toolMode === "liquidity" ? (
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
            ) : null}
          </section>
        </div>
      </TabsContent>
    </Tabs>
  );
}
