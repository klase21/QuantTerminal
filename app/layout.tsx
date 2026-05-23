// ======================================================
// app/layout.tsx
// ======================================================

import "./globals.css"

import { RuntimeShell } from "@/components/system/RuntimeShell"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body><RuntimeShell>{children}</RuntimeShell></body>
    </html>
  )
}