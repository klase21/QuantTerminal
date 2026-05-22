"use client";

import TickerBar from "@/components/TickerBar";
import MacroTickerStrip from "@/components/macro/MacroTickerStrip";
import LiveCommandSurface from "@/components/command/LiveCommandSurface";
import NarrativeIntelligenceSurface from "@/components/narrative/NarrativeIntelligenceSurface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TerminalSurfaceDeck() {
  return (
    <div className="shrink-0 border-b border-zinc-900 bg-black">
      <div className="border-b border-zinc-900 bg-zinc-950 px-4 py-3">
        <TickerBar />
      </div>

      <div className="border-b border-zinc-900 bg-zinc-950/80">
        <MacroTickerStrip />
      </div>

      <div className="px-4 py-3">
        <Tabs defaultValue="command" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">
                Terminal Surface
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Live command layer separated from deep workspace experiments.
              </div>
            </div>

            <TabsList className="h-8 bg-zinc-950/80 text-xs">
              <TabsTrigger value="command" className="px-3 py-1 text-xs">
                Command
              </TabsTrigger>
              <TabsTrigger value="narrative" className="px-3 py-1 text-xs">
                Narrative
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="command" className="m-0 min-h-0 overflow-visible">
            <LiveCommandSurface />
          </TabsContent>

          <TabsContent value="narrative" className="m-0 min-h-0 overflow-visible">
            <NarrativeIntelligenceSurface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
