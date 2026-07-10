import * as React from "react"

import { Button, type FoundationButtonProps } from "@/components/ui/foundation/button"
import { cn } from "@/lib/utils"

export interface IconButtonProps extends Omit<FoundationButtonProps, "children" | "aria-label"> {
  readonly accessibleName: string
  readonly children: React.ReactNode
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ accessibleName, children, className, ...props }, ref) => (
    <Button
      ref={ref}
      aria-label={accessibleName}
      className={cn("aspect-square min-h-[var(--qt-touch-target)] min-w-[var(--qt-touch-target)] p-0", className)}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </Button>
  ),
)
IconButton.displayName = "IconButton"
