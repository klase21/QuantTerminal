import React from "react"

import { Badge, type BadgeProps } from "@/components/ui/foundation/badge"
import type { AvailabilityModel, AvailabilityState } from "@/lib/design-system"

const toneByAvailability: Record<AvailabilityState, NonNullable<BadgeProps["tone"]>> = {
  AVAILABLE: "success",
  UNAVAILABLE: "neutral",
  STALE: "warning",
  MISSING: "neutral",
  EXPERIMENTAL: "experimental",
}

export function AvailabilityBadge({ availability, className }: { readonly availability: AvailabilityModel; readonly className?: string }) {
  const description = availability.reason ? `${availability.state}: ${availability.reason}` : availability.state
  return (
    <Badge className={className} tone={toneByAvailability[availability.state]} role="status" aria-label={description} title={availability.reason ?? undefined}>
      {availability.state}
    </Badge>
  )
}
