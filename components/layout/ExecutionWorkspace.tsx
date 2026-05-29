"use client";

import { useMemo, useState } from "react";
import { HelpCircle, X } from "lucide-react";

import MultiChartWorkspace from "@/components/MultiChartWorkspace";
import Orderbook from "@/components/Orderbook";
import FlowPanel from "@/components/right-panel/FlowPanel";
import FlowAdvancedWorkspace from "@/components/flow/FlowAdvancedWorkspace";
import Footprint from "@/components/Footprint";
import RotationSankeyGraph from "@/components/RotationSankeyGraph";
import LiquidityPanel from "@/components/right-panel/LiquidityPanel";
import LiquidityRotationPanel from "@/components/right-panel/LiquidityRotationPanel";
import RealtimeIntelligenceStrip from "@/components/macro/RealtimeIntelligenceStrip";
import ResearchReplayWorkspace from "@/components/research/ResearchReplayWorkspace";
import SignalInboxWorkspace from "@/components/product/SignalInboxWorkspace";
import SystemDiagnosticsWorkspace from "@/components/system/SystemDiagnosticsWorkspace";
import NarrativeIntelligenceSurface from "@/components/narrative/NarrativeIntelligenceSurface";
import TacticalDecisionCompressionPanel from "@/components/decision/TacticalDecisionCompressionPanel";
import MarketStructureIntelligenceSurface from "@/components/market-structure/MarketStructureIntelligenceSurface";
import FeatureHelpGuide from "@/components/help/FeatureHelpGuide";
import AdvancedIntelligenceArchive from "@/components/execution/AdvancedIntelligenceArchive";
import MarketMoverPlanningPanel from "@/components/market-movers/MarketMoverPlanningPanel";
import TacticalWorkspaceBar from "@/components/workspace/TacticalWorkspaceBar";
import TacticalHotkeys from "@/components/workspace/TacticalHotkeys";
import HotkeyHelpCard from "@/components/workspace/HotkeyHelpCard";
import FocusRoutingBar from "@/components/workspace/FocusRoutingBar";
import FocusLinkedStateCard from "@/components/workspace/FocusLinkedStateCard";
import SymbolContextCard from "@/components/focus/SymbolContextCard";
import LinkedRoutingStatus from "@/components/focus/LinkedRoutingStatus";
import TacticalContextBar from "@/components/context/TacticalContextBar";
import CompactRoutingStatus from "@/components/context/CompactRoutingStatus";
import MarketModeToggle from "@/components/dual-market/MarketModeToggle";
import DualMarketIntelligencePanel from "@/components/dual-market/DualMarketIntelligencePanel";
import { useTacticalWorkspaceStore } from "@/stores/useTacticalWorkspaceStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExecutionWorkspaceProps = {
  orderbook: any;
  trades: any[];
  flow: any;
  spotFlow?: any;
  futuresFlow?: any;
  marketMode?: string;
  symbol?: string;
  footprint: any;
  frames: any[];
  liquidityEvents: any[];
};

type ToolMode = "intel" | "macro" | "liquidity" | "structure" | "research" | "diagnostics";

type WorkspaceMode = "default" | "advanced" | "help";


const toolModes: { id: ToolMode; label: string; hint: string }[] = [
  { id: "intel", label: "Live Intelligence", hint: "compact market pulse" },
  { id: "macro", label: "Research Archive", hint: "macro + news context" },
  { id: "liquidity", label: "Liquidity Tools", hint: "rotation + events" },
  { id: "structure", label: "Market Structure", hint: "regime + structure" },
  { id: "research", label: "Replay", hint: "review + memory" },
  { id: "diagnostics", label: "System Health", hint: "runtime status" },
];

function ToolModeButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
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
  spotFlow,
  futuresFlow,
  marketMode,
  symbol,
  footprint,
  frames,
  liquidityEvents,
}: ExecutionWorkspaceProps) {
  const [toolMode, setToolMode] = useState<ToolMode>("intel");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("default");
  const [flowHelpOpen, setFlowHelpOpen] = useState(false);
  const { flowAdvanced, setFlowAdvanced } = useTacticalWorkspaceStore();

  return (
    <>
      <TacticalHotkeys />

      <div className="mb-4 flex items-center gap-2">
        {(["default","advanced","help"] as WorkspaceMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setWorkspaceMode(mode)}
            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition ${
              workspaceMode === mode
                ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-500"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <Tabs defaultValue="narrative" className="flex h-full min-h-0 flex-col gap-4">
        <TabsList className={`grid h-auto w-full shrink-0 gap-2 rounded-2xl border border-zinc-900 bg-black/70 p-2 ${workspaceMode === "default" ? "grid-cols-2" : "grid-cols-2 md:grid-cols-5"}`}>
          <TabsTrigger value="narrative" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-100">
            Execution
          </TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          {workspaceMode !== "default" ? <TabsTrigger value="flow">Flow</TabsTrigger> : null}
          {workspaceMode !== "default" ? <TabsTrigger value="signals">Signals</TabsTrigger> : null}
          {workspaceMode !== "default" ? <TabsTrigger value="tools">More Tools</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="narrative" className="m-0 min-h-0 overflow-y-auto pr-1">
          {workspaceMode === "default" ? (
            <div className="space-y-3">
              <TacticalDecisionCompressionPanel flow={flow} />
            </div>
          ) : null}

          {workspaceMode === "advanced" ? (
            <div className="space-y-3">
              <MarketMoverPlanningPanel />

              <details className="group rounded-3xl border border-zinc-900 bg-black/60" open={false}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-black text-white">
                  <span>Narrative Context</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 group-open:text-cyan-300">Open</span>
                </summary>
                <div className="border-t border-zinc-900 p-3">
                  <NarrativeIntelligenceSurface />
                </div>
              </details>
            </div>
          ) : null}

          {workspaceMode === "help" ? <FeatureHelpGuide section="overview" /> : null}
        </TabsContent>

        <TabsContent value="charts" className="m-0 min-h-0 overflow-y-auto pr-1">
          {workspaceMode === "help" ? <FeatureHelpGuide section="charts" /> : <MultiChartWorkspace />}
        </TabsContent>

        <TabsContent value="flow" className="m-0 min-h-0">
          {workspaceMode === "help" ? (
            <div className="h-full overflow-y-auto pr-1">
              <FeatureHelpGuide section="flow" />
            </div>
          ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <TacticalContextBar />
            <CompactRoutingStatus />
            {spotFlow && futuresFlow ? (
              <DualMarketIntelligencePanel symbol={symbol || "BTCUSDT"} spotFlow={spotFlow} futuresFlow={futuresFlow} />
            ) : null}

            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
              <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40 p-2">
                <Orderbook symbol={symbol || "BTCUSDT"} bids={orderbook?.bids || []} asks={orderbook?.asks || []} />
              </div>

              <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40">
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-900 bg-black/70 px-3 py-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                      Flow Workspace
                    </div>
                    <div className="text-xs font-black text-white">
                      {flowAdvanced ? "Advanced Predictive Mode" : "Live Execution Flow"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFlowHelpOpen(true)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 transition hover:border-cyan-300/40 hover:text-cyan-100"
                      aria-label="Open Flow help"
                    >
                      <HelpCircle size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setFlowAdvanced(!flowAdvanced)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                        flowAdvanced
                          ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,.18)]"
                          : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-cyan-300/40 hover:text-cyan-100"
                      }`}
                    >
                      {flowAdvanced ? "Basic Mode" : "Advanced Mode"}
                    </button>
                  </div>
                </div>

                {flowAdvanced ? (
                  <div className="flex-1 min-h-0 overflow-y-auto p-2">
                    <FlowAdvancedWorkspace flow={flow} />
                  </div>
                ) : (
                  <div className="grid flex-1 min-h-0 grid-rows-[auto_minmax(0,1fr)]">
                    <div className="shrink-0 overflow-hidden">
                      <FlowPanel trades={trades} flow={flow} />
                    </div>

                    <div className="min-h-0 overflow-hidden border-t border-zinc-900 p-2">
                      <Footprint levels={footprint} />
                    </div>
                  </div>
                )}

                {flowHelpOpen ? (
                  <div className="absolute inset-0 z-30 flex items-start justify-end bg-black/65 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                            Flow Help
                          </div>
                          <div className="mt-1 text-lg font-black text-white">
                            Execution Intelligence Guide
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFlowHelpOpen(false)}
                          className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-black text-zinc-400 hover:text-white"
                          aria-label="Close Flow help"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="space-y-3 text-sm text-zinc-300">
                        <HotkeyHelpCard />

                        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-3">
                          <div className="mb-1 text-xs font-black uppercase tracking-wide text-cyan-300">
                            Trigger Stack
                          </div>
                          <div className="text-zinc-400">
                            Use this as a checklist: pressure fade, absorption, and CVD recovery are confirmation triggers, not separate panels that need to occupy live trading space.
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-3">
                          <div className="mb-1 text-xs font-black uppercase tracking-wide text-purple-300">
                            Universe Link
                          </div>
                          <div className="text-zinc-400">
                            Flow validates or invalidates the Universe rotation read. Strong rotation with weak execution flow means wait for confirmation.
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-3">
                          <div className="mb-1 text-xs font-black uppercase tracking-wide text-yellow-300">
                            Risk / Invalidation
                          </div>
                          <div className="text-zinc-400">
                            If tape speed is extreme or absorption appears, reduce chasing. Let the next trigger candle confirm before sizing.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="signals" className="m-0 min-h-0 overflow-y-auto pr-1">
          {workspaceMode === "help" ? <FeatureHelpGuide section="signals" /> : <SignalInboxWorkspace />}
        </TabsContent>

        <TabsContent value="tools" className="m-0 min-h-0 overflow-y-auto pr-1">
          {workspaceMode === "help" ? (
            <FeatureHelpGuide section="tools" />
          ) : (
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-3">
              <div className="px-2 pb-3 text-[10px] font-black uppercase tracking-[0.32em] text-zinc-500">
                Tools
              </div>
              <div className="grid gap-2">
                {toolModes.map((mode) => (
                  <ToolModeButton
                    key={mode.id}
                    active={toolMode === mode.id}
                    label={mode.label}
                    hint={mode.hint}
                    onClick={() => setToolMode(mode.id)}
                  />
                ))}
              </div>
            </aside>

            <section className="min-h-[720px] overflow-hidden rounded-3xl border border-zinc-900 bg-black p-4">
              {toolMode === "intel" ? (
                <div className="mx-auto max-w-5xl">
                  <RealtimeIntelligenceStrip />
                </div>
              ) : null}
              {toolMode === "macro" ? (
                <div className="max-h-[760px] overflow-y-auto pr-1">
                  <AdvancedIntelligenceArchive />
                </div>
              ) : null}
              {toolMode === "research" ? <ResearchReplayWorkspace /> : null}
              {toolMode === "diagnostics" ? <SystemDiagnosticsWorkspace /> : null}
              {toolMode === "structure" ? (
                <div className="max-h-[760px] overflow-y-auto pr-1">
                  <MarketStructureIntelligenceSurface />
                </div>
              ) : null}
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
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
