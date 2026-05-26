export interface TacticalAlert {
  title: string
  confidence: number
  priority: "LOW" | "MEDIUM" | "HIGH"
}

export function generateAlerts() {
  return [
    {
      title: "AI rotation accelerating with whale confirmation",
      confidence: 84,
      priority: "HIGH",
    },
    {
      title: "Funding overheating on MEME sector",
      confidence: 71,
      priority: "MEDIUM",
    },
  ]
}