"use client"

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import type { ExecutionChecklistItem } from "@/core/playbook/executionPlaybookEngine"

function StatusIcon({ status }: { status: ExecutionChecklistItem["status"] }) {
  if (status === "PASS") return <CheckCircle2 size={15} className="text-emerald-300" />
  if (status === "FAIL") return <AlertTriangle size={15} className="text-red-300" />
  return <Clock size={15} className="text-yellow-300" />
}

export default function ExecutionChecklist({ items }: { items: ExecutionChecklistItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <StatusIcon status={item.status} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-black text-white">{item.label}</div>
                <div className={
                  item.status === "PASS"
                    ? "text-[10px] font-black text-emerald-300"
                    : item.status === "FAIL"
                      ? "text-[10px] font-black text-red-300"
                      : "text-[10px] font-black text-yellow-300"
                }>
                  {item.status}
                </div>
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
