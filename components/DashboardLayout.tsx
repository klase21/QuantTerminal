"use client"
import { useEffect,useState } from "react"
import TickerBar from "@/components/TickerBar"
import Orderbook from "@/components/Orderbook"
import Footprint from "@/components/Footprint"
import Heatmap from "@/components/Heatmap"
import VolumeProfile from "@/components/VolumeProfile"
import SymbolSelector from "@/components/SymbolSelector"
import Panel from "@/components/ui/Panel"
import RightPanelTabs from "@/components/right-panel/RightPanelTabs"
import ResizablePanelGroup from "@/components/ResizablePanelGroup"
import useMarketSocket from "@/hooks/useMarketSocket"
import useOrderbookSocket from "@/hooks/useOrderbookSocket"
import useTradeSocket from "@/hooks/useTradeSocket"
import useLiquidationSocket from "@/hooks/useLiquidationSocket"
import useTradeFlowSocket from "@/hooks/useTradeFlowSocket"
import useFootprint from "@/hooks/useFootprint"
import useDepthHeatmap from "@/hooks/useDepthHeatmap"
import useVolumeProfile from "@/hooks/useVolumeProfile"
import { useHeatmapHistory } from "@/hooks/useHeatmapHistory"
import useLiquidityEvents from "@/hooks/useLiquidityEvents"
import useAbsorptionDetector from "@/hooks/useAbsorptionDetector"
import { useMarketStore } from "@/stores/useMarketStore"
import MultiChartWorkspace from "@/components/MultiChartWorkspace"
import AlertCenter from "@/components/AlertCenter"
import useAlertEngine from "@/hooks/useAlertEngine"
import MacroTickerStrip from "@/components/macro/MacroTickerStrip"

export default function DashboardLayout(){
useMarketSocket()
const symbol=useMarketStore(s=>s.selectedSymbol)
useOrderbookSocket(symbol)
const orderbook=useMarketStore(s=>s.orderbook)
const {trades}=useTradeSocket(symbol)
const {liquidations}=useLiquidationSocket()
const flow=useTradeFlowSocket(symbol)
const footprint=useFootprint(symbol)
const heatmap=useDepthHeatmap(symbol)
const volumeProfile=useVolumeProfile(symbol)
const frames=useHeatmapHistory(orderbook?.bids||[],orderbook?.asks||[])
const liquidityEvents=useLiquidityEvents(heatmap?.flatMap((f:any)=>[...(f?.bids||[]),...(f?.asks||[])])||[])
const absorptionEvents=useAbsorptionDetector(trades||[])
useAlertEngine({absorptionEvents,liquidityEvents,liquidations})
const [collapsed,setCollapsed]=useState<Record<string,boolean>>({orderbook:false,heatmap:false,workspace:false,footprint:false,volumeProfile:false,rightPanel:false})
useEffect(()=>{const saved=localStorage.getItem('qt-layout-collapse'); if(saved) setCollapsed(JSON.parse(saved))},[])
useEffect(()=>{localStorage.setItem('qt-layout-collapse',JSON.stringify(collapsed))},[collapsed])
const togglePanel=(key:string)=>setCollapsed(prev=>({...prev,[key]:!prev[key]}))
return <div className="flex min-h-screen flex-col overflow-x-hidden bg-black text-white">
<div className="shrink-0 border-b border-zinc-900 bg-zinc-950 px-4 py-3"><TickerBar/></div>
<div className="shrink-0 border-b border-zinc-900 bg-zinc-950/80"><MacroTickerStrip/></div>
<div className="shrink-0 border-b border-zinc-900 px-4 py-3"><SymbolSelector/></div>
<main className="flex-1 overflow-y-auto p-4">
<ResizablePanelGroup
left={<div className="space-y-4"><Panel title="Execution Workspace"><MultiChartWorkspace/></Panel><Panel title="Orderbook" right="ALT+1" collapsible collapsed={collapsed.orderbook} onToggle={()=>togglePanel('orderbook')}>{!collapsed.orderbook&&<Orderbook bids={orderbook?.bids||[]} asks={orderbook?.asks||[]}/>}</Panel><Panel title="Heatmap" right="ALT+2" collapsible collapsed={collapsed.heatmap} onToggle={()=>togglePanel('heatmap')}>{!collapsed.heatmap&&<Heatmap levels={heatmap}/>}</Panel></div>}
center={<div className="space-y-4"><Panel title="Footprint Heatmap" right="ALT+3" collapsible collapsed={collapsed.footprint} onToggle={()=>togglePanel('footprint')}>{!collapsed.footprint&&<Footprint levels={footprint}/>}</Panel><Panel title="Volume Profile" collapsible collapsed={collapsed.volumeProfile} onToggle={()=>togglePanel('volumeProfile')}>{!collapsed.volumeProfile&&<VolumeProfile levels={volumeProfile}/>}</Panel></div>}
right={<Panel title="Macro Intelligence" collapsible collapsed={collapsed.rightPanel} onToggle={()=>togglePanel('rightPanel')}>{!collapsed.rightPanel&&<RightPanelTabs trades={trades} liquidations={liquidations} frames={frames} absorptionEvents={absorptionEvents} liquidityEvents={liquidityEvents} flow={flow}/>}</Panel>}
/>
</main>
<AlertCenter/>
</div>
}
