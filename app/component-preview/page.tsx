import { notFound } from "next/navigation"

import { ReactFoundationPreview } from "@/components/foundation-preview/ReactFoundationPreview"

export default function ComponentPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <ReactFoundationPreview />
}
