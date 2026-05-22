"use client";

import TickerBar from "@/components/TickerBar";
import MacroTickerStrip from "@/components/macro/MacroTickerStrip";
import LiveCommandSurface from "@/components/command/LiveCommandSurface";

export default function TerminalSurfaceDeck() {
  return (
    <div className="shrink-0 border-b border-zinc-900 bg-black">
      <div className="border-b border-zinc-900 bg-zinc-950 px-4 py-3">
        <TickerBar />
      </div>

      <div className="border-b border-zinc-900 bg-zinc-950/80">
        <MacroTickerStrip />
      </div>

      <LiveCommandSurface />
    </div>
  );
}
