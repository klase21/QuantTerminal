"use client"

import { useEffect } from "react"

import { startMockFeed } from "@/services/mockFeed"

export function useRealtimeFeed() {
  useEffect(() => {
    startMockFeed()
  }, [])
}