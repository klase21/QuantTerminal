import type { TerminalEventSeverity, TerminalEventType } from "../event-bus/types"

export interface TimelineItem {
  id: string
  type: TerminalEventType
  severity: TerminalEventSeverity
  title: string
  body: string
  timestamp: number
  tags: string[]
}
