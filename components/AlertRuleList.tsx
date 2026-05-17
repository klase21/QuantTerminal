"use client"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { Switch } from "@/components/ui/switch"

import { useAlertRuleStore }
  from "@/stores/useAlertRuleStore"

export default function AlertRuleList() {

  const {
    rules,
    removeRule,
    toggleRule,
  } = useAlertRuleStore()

  return (

    <div className="space-y-3">

      {rules.map((rule) => (

        <Card key={rule.id}>

          <CardContent className="p-4 flex items-center justify-between">

            <div>

              <div className="font-semibold">
                {rule.symbol}
              </div>

              <div className="text-sm text-muted-foreground">
                Trigger : {rule.condition}
              </div>

            </div>

            <div className="flex items-center gap-3">

              <Switch
                checked={rule.enabled}
                onCheckedChange={() =>
                  toggleRule(rule.id)
                }
              />

              <Button
                variant="destructive"
                onClick={() =>
                  removeRule(rule.id)
                }
              >
                Delete
              </Button>

            </div>

          </CardContent>

        </Card>

      ))}

    </div>

  )

}