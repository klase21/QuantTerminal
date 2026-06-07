"use client";

type GuideSection = "overview" | "execution" | "charts" | "flow" | "signals" | "tools";

type FeatureGuide = {
  title: string;
  mode: string;
  lookAt: string[];
  tellsYou: string[];
  ignoreWhen: string[];
  decisionUse: string;
};

const guides: Record<GuideSection, FeatureGuide[]> = {
  overview: [
    {
      title: "Final Tactical Decision",
      mode: "Default",
      lookAt: ["Action state: WAIT / ENTER / WATCH / AVOID", "Top trigger", "SL / invalidation", "Risk level"],
      tellsYou: ["Whether the current market is worth acting on", "What condition must happen before entry", "What cancels the setup"],
      ignoreWhen: ["You are researching rather than trading", "The market is closed or data is stale"],
      decisionUse: "Start here. If this says WAIT or AVOID, every other panel is secondary.",
    },
    {
      title: "Top Opportunities",
      mode: "Default",
      lookAt: ["Only the top 1-3 setups", "Confidence", "Chase risk", "Execution mode"],
      tellsYou: ["Which setups deserve attention", "Whether the opportunity is early, confirmed, or late"],
      ignoreWhen: ["The confidence is low", "Risk is high and trigger is missing"],
      decisionUse: "Use it as an attention filter, not as a reason to enter immediately.",
    },
    {
      title: "Advanced Intelligence",
      mode: "Advanced",
      lookAt: ["Flow details", "Narrative drivers", "Liquidation/liquidity context", "Macro/structure"],
      tellsYou: ["Why the compressed decision was formed", "Which signal is supporting or weakening the setup"],
      ignoreWhen: ["You need fast execution clarity", "You are forcing a trade because there is too much data"],
      decisionUse: "Open Advanced only to verify, debug, or study the decision.",
    },
  ],
  execution: [
    {
      title: "Execution Decision Strip",
      mode: "Default",
      lookAt: ["Primary action", "Readiness", "Friction", "Chase risk", "Next trigger"],
      tellsYou: ["Trade now vs wait", "Whether execution quality is improving or deteriorating", "Whether you are late"],
      ignoreWhen: ["You have no valid trigger", "The setup is outside your timeframe"],
      decisionUse: "This is the command layer. Do not overrule it with a random single signal.",
    },
    {
      title: "Opportunity Compression",
      mode: "Default",
      lookAt: ["Best setup", "Suppressed setups", "Entry / SL / TP", "Timing label"],
      tellsYou: ["What is actionable", "What has been intentionally hidden", "What should stop the trade idea"],
      ignoreWhen: ["All opportunities are suppressed", "Timing says late/exhausted"],
      decisionUse: "Pick from compressed opportunities only; do not chase buried signals.",
    },
    {
      title: "Decision Reason",
      mode: "Help",
      lookAt: ["Why the engine is cautious or aggressive", "Risk penalties", "Missing confirmations"],
      tellsYou: ["The reasoning behind WAIT / ENTER / AVOID", "What must change to upgrade the decision"],
      ignoreWhen: ["You already have a clear execution plan", "You are using it to justify revenge trading"],
      decisionUse: "Use this to understand the decision, not to add more noise to the screen.",
    },
  ],
  charts: [
    {
      title: "Multi Chart Workspace",
      mode: "Default / Advanced",
      lookAt: ["Structure break", "VWAP/reclaim area", "Support/resistance reaction", "Higher timeframe alignment"],
      tellsYou: ["Where execution can be triggered", "Whether price confirms the tactical decision", "Whether entry is late"],
      ignoreWhen: ["You are zooming until you find confirmation", "The chart conflicts with the final decision and you have no trigger"],
      decisionUse: "Charts are for timing and invalidation, not for discovering every possible idea.",
    },
    {
      title: "Core Indicators",
      mode: "Advanced Chart",
      lookAt: ["SMA20/SMA200 for structure", "MACD for momentum shift", "Stoch for timing wave", "Volume Profile for acceptance zones"],
      tellsYou: ["Whether price is early or late", "Where pullback/reclaim triggers may form", "Whether momentum agrees with execution"],
      ignoreWhen: ["You are using one indicator as a standalone signal", "The final decision says WAIT/AVOID and there is no trigger"],
      decisionUse: "Use indicators to time a decision that already exists, not to create new trades in Default Mode.",
    },
    {
      title: "Orderbook / Footprint Context",
      mode: "Flow Tab",
      lookAt: ["Absorption", "Imbalance", "Tape speed", "Bid/ask pressure shift"],
      tellsYou: ["Whether real-time execution supports the setup", "Whether breakout/fade is being absorbed"],
      ignoreWhen: ["Liquidity is thin", "One print appears without follow-through"],
      decisionUse: "Use it as final confirmation after the decision layer, not as the whole strategy.",
    },
  ],
  flow: [
    {
      title: "Live Execution Flow",
      mode: "Default",
      lookAt: ["CVD direction", "Aggressor imbalance", "Absorption", "Pressure fade/reversal"],
      tellsYou: ["Whether buyers or sellers are actually pushing", "Whether a move is being accepted or rejected"],
      ignoreWhen: ["Flow is noisy around low volume", "Price is chopping without structure"],
      decisionUse: "Flow should confirm timing. It should not create a trade by itself.",
    },
    {
      title: "Advanced Flow Workspace",
      mode: "Advanced",
      lookAt: ["Predictive flow state", "Flow divergence", "Execution pressure clusters", "Microstructure changes"],
      tellsYou: ["Why the live trigger is strong or weak", "Whether pressure is early, confirmed, or exhausted"],
      ignoreWhen: ["You need fast execution", "You are below your trading timeframe"],
      decisionUse: "Use Advanced Flow to diagnose why a setup is not triggering cleanly.",
    },
    {
      title: "Dual Market Intelligence",
      mode: "Advanced",
      lookAt: ["Spot vs futures divergence", "Futures-led move", "Spot support", "Perp crowding"],
      tellsYou: ["Whether a move is organic or leveraged", "Whether futures are chasing without spot confirmation"],
      ignoreWhen: ["Spot/futures data is incomplete", "The signal is stale"],
      decisionUse: "Upgrade setups when spot confirms; downgrade when only futures are pushing.",
    },
  ],
  signals: [
    {
      title: "Signal Inbox",
      mode: "Advanced / Help",
      lookAt: ["Newest high-severity signals", "Repeated signal type", "Source alignment", "Dismissed/suppressed items"],
      tellsYou: ["What recently changed", "Which signals are clustering", "What the system is deprioritizing"],
      ignoreWhen: ["Signals are isolated", "There is no execution trigger", "Multiple low-quality alerts fight each other"],
      decisionUse: "Treat it as an inbox of context changes, not a shopping list of trades.",
    },
    {
      title: "Alert / Signal Productization",
      mode: "Advanced",
      lookAt: ["Rule match", "Severity", "Cooldown", "False-positive pattern"],
      tellsYou: ["Which rules are firing too often", "What needs filtering", "Whether alert fatigue is building"],
      ignoreWhen: ["You are already overloaded", "The same alert repeats without price response"],
      decisionUse: "Use this to reduce noise and improve alert quality over time.",
    },
  ],
  tools: [
    {
      title: "Realtime Intel",
      mode: "Advanced",
      lookAt: ["Macro/news pulse", "Narrative shift", "Risk-on/risk-off tone", "Fresh catalyst"],
      tellsYou: ["What may be driving the move", "Whether narrative supports execution"],
      ignoreWhen: ["News is old", "Price/flow has already fully reacted"],
      decisionUse: "Use it to explain context, not to enter without a trigger.",
    },
    {
      title: "Liquidity / Rotation",
      mode: "Advanced",
      lookAt: ["Capital flow direction", "Sector rotation path", "Liquidity events", "Sankey concentration"],
      tellsYou: ["Where attention and capital are moving", "Whether a sector setup is early or crowded"],
      ignoreWhen: ["Rotation is scattered", "No asset has clean execution confirmation"],
      decisionUse: "Use it to choose the battlefield, then use Execution for timing.",
    },
    {
      title: "Market Structure",
      mode: "Advanced",
      lookAt: ["Regime", "Trend/chop state", "Expansion vs exhaustion", "Macro-aware structure"],
      tellsYou: ["Which strategies are favored", "Whether breakout or mean-reversion has better fit"],
      ignoreWhen: ["Regime is mixed", "Structure is changing too quickly"],
      decisionUse: "Use structure to filter strategy type before reading individual signals.",
    },
    {
      title: "Research Replay",
      mode: "Advanced",
      lookAt: ["Past decision state", "Signal sequence", "What changed before the move", "Failure pattern"],
      tellsYou: ["Whether the engine’s logic would have helped", "Which signals were useful or noisy"],
      ignoreWhen: ["You are actively trading live", "Replay is being used to curve-fit"],
      decisionUse: "Use for learning and calibration, not live entry.",
    },
    {
      title: "Diagnostics",
      mode: "Advanced",
      lookAt: ["Runtime health", "Data freshness", "Binding status", "Error state"],
      tellsYou: ["Whether the system is reliable right now", "Whether data is stale or broken"],
      ignoreWhen: ["Everything is healthy", "You are not debugging"],
      decisionUse: "Check this before trusting decisions if something feels off.",
    },
  ],
};

const labels: Record<GuideSection, string> = {
  overview: "Complete Help Map",
  execution: "Execution Help",
  charts: "Charts Help",
  flow: "Flow Help",
  signals: "Signals Help",
  tools: "Advanced Tools Help",
};

function GuideCard({ guide }: { guide: FeatureGuide }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">{guide.mode}</div>
          <div className="mt-1 text-lg font-black text-white">{guide.title}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">What to watch</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-300">
            {guide.lookAt.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">What it tells you</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-300">
            {guide.tellsYou.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">When to ignore</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-300">
            {guide.ignoreWhen.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-sm font-semibold text-cyan-100">
        Decision use: <span className="font-normal text-cyan-100/80">{guide.decisionUse}</span>
      </div>
    </div>
  );
}

export default function FeatureHelpGuide({ section = "overview" }: { section?: GuideSection }) {
  const selected = guides[section];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-zinc-800 bg-black/70 p-6">
        <div className="text-xs font-black uppercase tracking-[0.32em] text-cyan-300">Help Mode</div>
        <div className="mt-2 text-2xl font-black text-white">{labels[section]}</div>
        <div className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
          Help Mode explains each feature by decision value: what to watch, what it tells you, when to ignore it, and how it should affect execution. Static education lives here so Default Mode can stay focused on action.
        </div>
      </div>

      <div className="grid gap-4">
        {selected.map((guide) => <GuideCard key={guide.title} guide={guide} />)}
      </div>
    </div>
  );
}
