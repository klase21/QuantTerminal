
"use client";
export default function AnimatedSankeyOverlay() {
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="text-sm font-semibold text-cyan-400">
        Animated Sankey Transitions
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full w-full animate-pulse rounded-full bg-cyan-400" />
      </div>
    </div>
  );
}
