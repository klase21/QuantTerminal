"use client"

import { Crosshair, Eye, Keyboard, RotateCcw, Save } from "lucide-react"
import {
  type TacticalFocusTarget,
  type TacticalWorkspacePreset,
  useTacticalWorkspaceStore,
} from "@/stores/useTacticalWorkspaceStore"

const presets: TacticalWorkspacePreset[] = [
  "SCALP",
  "SWING",
  "RISK_OFF",
  "AI_ROTATION",
]

const focusTargets: TacticalFocusTarget[] = [
  "NONE",
  "BTC",
  "ETH",
  "AI",
  "RWA",
  "MEME",
  "L2",
  "STABLE",
]

export default function TacticalWorkspaceBar() {
  const {
    preset,
    focusTarget,
    attentionMode,
    hotkeysEnabled,
    setPreset,
    setFocusTarget,
    setAttentionMode,
    setHotkeysEnabled,
    resetWorkspace,
  } = useTacticalWorkspaceStore()

  return (
    <div className="rounded-3xl border border-zinc-900 bg-black/70 p-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
            <Save size={13} />
            Tactical Workspace OS
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Layout memory, presets, focus routing, and hotkeys.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-900 bg-zinc-950/80 p-1">
            {presets.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPreset(item)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  preset === item
                    ? "bg-cyan-400/15 text-cyan-100"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {item.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-zinc-900 bg-zinc-950/80 p-1">
            <div className="px-2 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Focus
            </div>
            <select
              value={focusTarget}
              onChange={(event) => setFocusTarget(event.target.value as TacticalFocusTarget)}
              className="rounded-xl border border-zinc-800 bg-black px-2 py-1.5 text-xs font-bold text-zinc-200 outline-none"
            >
              {focusTargets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setAttentionMode(!attentionMode)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${
              attentionMode
                ? "border-purple-300/40 bg-purple-400/10 text-purple-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-500"
            }`}
          >
            <Eye size={13} />
            Attention
          </button>

          <button
            type="button"
            onClick={() => setHotkeysEnabled(!hotkeysEnabled)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${
              hotkeysEnabled
                ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-500"
            }`}
          >
            <Keyboard size={13} />
            Hotkeys
          </button>

          <button
            type="button"
            onClick={resetWorkspace}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-200"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {focusTarget !== "NONE" ? (
        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
          <span className="font-black">Focus Mode:</span> {focusTarget} related routes, guidance, and panels should receive priority.
        </div>
      ) : null}
    </div>
  )
}
