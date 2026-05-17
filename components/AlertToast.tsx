// ======================================================
// /components/AlertToast.tsx
// ======================================================

"use client"

import { Bell } from "lucide-react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import { useAlertStore }
  from "@/stores/useAlertStore"

export default function AlertToast() {

  const alerts =
    useAlertStore(
      (s) => s.alerts
    )

  return (

    <div className="fixed top-4 right-4 z-50 space-y-3 w-[320px]">

      {alerts.slice(0, 5).map((alert) => (

        <Card
          key={alert.id}
          className="border-yellow-500"
        >

          <CardContent className="p-4 flex gap-3 items-start">

            <Bell className="w-5 h-5 text-yellow-500" />

            <div>

              <div className="font-semibold">
                {alert.type}
              </div>

              <div className="text-sm text-muted-foreground">
                {alert.message}
              </div>

            </div>

          </CardContent>

        </Card>

      ))}

    </div>

  )

}