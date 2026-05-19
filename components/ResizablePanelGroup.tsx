"use client"
import { ReactNode, useEffect, useRef, useState } from "react"
interface Props{left:ReactNode;center:ReactNode;right:ReactNode}
export default function ResizablePanelGroup({left,center,right}:Props){
const containerRef=useRef<HTMLDivElement>(null)
const leftRef=useRef<HTMLDivElement>(null)
const rightRef=useRef<HTMLDivElement>(null)
const [leftWidth,setLeftWidth]=useState(50)
const [manualResize,setManualResize]=useState(false)
const dragging=useRef<"left"|null>(null)
useEffect(()=>{if(manualResize)return;const resize=()=>{const l=leftRef.current?.scrollHeight||1;const r=rightRef.current?.scrollHeight||1;const next=Math.min(62,Math.max(38,(l/(l+r))*100));setLeftWidth(next)};resize();const ob=new ResizeObserver(resize);if(leftRef.current)ob.observe(leftRef.current);if(rightRef.current)ob.observe(rightRef.current);window.addEventListener("resize",resize);return()=>{ob.disconnect();window.removeEventListener("resize",resize)}},[left,right,manualResize])
useEffect(()=>{function onMove(e:MouseEvent){if(!containerRef.current||!dragging.current)return;const rect=containerRef.current.getBoundingClientRect();const next=((e.clientX-rect.left)/rect.width)*100;if(next>=25&&next<=75)setLeftWidth(next)}function onUp(){dragging.current=null}window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp)}},[])
return <div ref={containerRef} className="flex h-full w-full gap-3"><div ref={leftRef} style={{width:`${leftWidth}%`}} className="min-w-0 transition-all duration-300">{left}</div><div onMouseDown={()=>{dragging.current="left";setManualResize(true)}} className="w-1 cursor-col-resize rounded-full bg-zinc-800 hover:bg-zinc-600"/>{!!center&&<div className="hidden">{center}</div>}<div ref={rightRef} style={{width:`${100-leftWidth}%`}} className="min-w-0 transition-all duration-300">{right}</div></div>}
