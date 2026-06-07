"use client"

import { type ReactNode } from "react"

import useSafeTacticalLiveBinding from "@/hooks/useSafeTacticalLiveBinding"

export default function TacticalLiveBindingProvider({ children }: { children: ReactNode }) {
  useSafeTacticalLiveBinding()
  return <>{children}</>
}
