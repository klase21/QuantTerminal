"use client"
import { useState } from "react"
import FlowPanel from "@/components/right-panel/FlowPanel"
import LiquidityPanel from "@/components/right-panel/LiquidityPanel"
import AnalyticsPanel from "@/components/right-panel/AnalyticsPanel"
import AlertsPanel from "@/components/right-panel/AlertsPanel"
import MacroPanel from "@/components/macro/MacroPanel"
import MacroNewsCorrelation from "@/components/macro/MacroNewsCorrelation"
import NewsFeed from "@/components/news/NewsFeed"

type Props = {
 trades:any[]
 liquidations:any[]
 frames:any[]
 absorptionEvents:any[]
 liquidityEvents:any[]
 flow:any
}

export default function RightPanelTabs({trades,liquidations,frames,absorptionEvents,liquidityEvents,flow}:Props){
 const [tab,setTab]=useState<"flow"|"liquidity"|"analytics"|"alerts"|"news"|"macro"|"correlation">("macro")
 const tabs=["macro","correlation","flow","liquidity","analytics","alerts","news"]
 return <div className="h-full flex flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40">
 <div className="grid grid-cols-4 gap-2 p-2 border-b border-zinc-800">
 {tabs.map(t=><button key={t} onClick={()=>setTab(t as any)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${tab===t?"bg-zinc-800 text-white":"text-zinc-500 hover:text-white"}`}>{t.toUpperCase()}</button>)}
 </div>
 <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
 {tab==='macro' && <div className="p-4"><MacroPanel/></div>}
 {tab==='correlation' && <div className="p-4"><MacroNewsCorrelation/></div>}
 {tab==='flow' && <FlowPanel trades={trades} flow={flow}/>}
 {tab==='liquidity' && <LiquidityPanel frames={frames} liquidityEvents={liquidityEvents}/>}
 {tab==='analytics' && <AnalyticsPanel absorptionEvents={absorptionEvents}/>}
 {tab==='alerts' && <AlertsPanel liquidations={liquidations}/>}
 {tab==='news' && <div className="p-4"><NewsFeed/></div>}
 </div>
 </div>
}
