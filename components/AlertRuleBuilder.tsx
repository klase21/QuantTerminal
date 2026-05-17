// ======================================================
// components/AlertRuleBuilder.tsx
// ======================================================

"use client"

import { useState } from "react"

import type {
  AlertType,
  AlertSeverity,
  AlertSound,
} from "@/types/alert"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  Input,
} from "@/components/ui/input"

import {
  Button,
} from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  generateId,
} from "@/lib/generate-id"

import {
  useAlertRuleStore,
} from "@/stores/useAlertRuleStore"

export default function AlertRuleBuilder() {

  const addRule =
    useAlertRuleStore(
      (s) => s.addRule
    )

  const [symbol, setSymbol] =
    useState("BTCUSDT")

  const [type, setType] =
    useState<AlertType>(
      "PRICE_ABOVE"
    )

  const [value, setValue] =
    useState(100000)

  const [severity, setSeverity] =
    useState<AlertSeverity>(
      "INFO"
    )

  const [sound, setSound] =
    useState<AlertSound>(
      "default"
    )

  const createRule = () => {

    addRule({

      // ======================================================
      // CORE
      // ======================================================

      id: generateId(),

      enabled: true,

      type,

      symbol,

      // ======================================================
      // CONDITIONS
      // ======================================================

      condition: value,

      cooldown: 5000,

      // ======================================================
      // UI
      // ======================================================

      severity,

      sound,

      message:
        `${symbol} ${type}`,

      // ======================================================
      // META
      // ======================================================

      createdAt:
        Date.now(),

    })

  }

  return (

    <Card
      className="
        border-zinc-800
        bg-zinc-950
      "
    >

      <CardContent
        className="
          p-4
          space-y-4
        "
      >

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-4
            gap-3
          "
        >

          {/* SYMBOL */}

          <Input
            value={symbol}
            onChange={(e) =>
              setSymbol(
                e.target.value
                  .toUpperCase()
              )
            }
            placeholder="BTCUSDT"
          />

          {/* TYPE */}

          <Select
            value={type}
            onValueChange={(v) =>
              setType(
                v as AlertType
              )
            }
          >

            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="PRICE_ABOVE">
                Price Above
              </SelectItem>

              <SelectItem value="PRICE_BELOW">
                Price Below
              </SelectItem>

              <SelectItem value="VOLUME_SPIKE">
                Volume Spike
              </SelectItem>

              <SelectItem value="LIQUIDATION">
                Liquidation
              </SelectItem>

              <SelectItem value="ABSORPTION">
                Absorption
              </SelectItem>

            </SelectContent>

          </Select>

          {/* VALUE */}

          <Input
            type="number"
            value={value}
            onChange={(e) =>
              setValue(
                Number(
                  e.target.value
                )
              )
            }
          />

          {/* SOUND */}

          <Select
            value={sound}
            onValueChange={(v) =>
              setSound(
                v as AlertSound
              )
            }
          >

            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="default">
                Default
              </SelectItem>

              <SelectItem value="absorption">
                Absorption
              </SelectItem>

              <SelectItem value="liquidation">
                Liquidation
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        <Button
          className="w-full"
          onClick={createRule}
        >
          Add Alert Rule
        </Button>

      </CardContent>

    </Card>

  )

}