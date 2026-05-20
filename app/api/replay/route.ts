
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    replay: [
      {
        timestamp: Date.now(),
        narrative: "AI",
        flow: "Meme -> AI",
        confidence: 87,
      },
    ],
  })
}
