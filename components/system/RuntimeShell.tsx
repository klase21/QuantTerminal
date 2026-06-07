"use client"

import { RuntimeErrorBoundary } from "@/components/system/RuntimeErrorBoundary"
import { RuntimeHealthMonitor } from "@/components/system/RuntimeHealthMonitor"

export function RuntimeShell({ children }: { children: React.ReactNode }) {
  return (
    <RuntimeErrorBoundary>
      {children}
      <RuntimeHealthMonitor />
    </RuntimeErrorBoundary>
  )
}
