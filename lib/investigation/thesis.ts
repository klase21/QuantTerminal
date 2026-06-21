import {
  INVESTIGATION_THESIS_STATUSES,
  INVESTIGATION_THESIS_VERSION,
  type InvestigationThesis,
  type InvestigationThesisStatus,
} from "@/types/investigationThesis"

function normalizedText(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || null
}

function normalizedTimestamp(value: string | null | undefined) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function normalizedStatus(value: string | null | undefined): InvestigationThesisStatus | null {
  return value && INVESTIGATION_THESIS_STATUSES.includes(value as InvestigationThesisStatus)
    ? value as InvestigationThesisStatus
    : null
}

function normalizedTags(values: string[] | undefined) {
  const tags = [...new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean))]
  return tags.length ? tags : undefined
}

export function createInvestigationThesis(input: {
  thesisId: string
  title: string
  question: string
  decisionHorizon: string
  status?: InvestigationThesisStatus
  createdAt?: string
  updatedAt?: string
  hypothesis?: string
  currentView?: string
  tags?: string[]
}): InvestigationThesis {
  const createdAt = normalizedTimestamp(input.createdAt) ?? new Date().toISOString()
  const updatedAt = normalizedTimestamp(input.updatedAt) ?? createdAt
  const thesisId = normalizedText(input.thesisId)
  const title = normalizedText(input.title)
  const question = normalizedText(input.question)
  const decisionHorizon = normalizedText(input.decisionHorizon)
  if (!thesisId || !title || !question || !decisionHorizon) {
    throw new Error("Investigation thesis id, title, question, and decision horizon are required.")
  }

  return {
    thesisVersion: INVESTIGATION_THESIS_VERSION,
    thesisId,
    title,
    question,
    decisionHorizon,
    status: input.status ?? "active",
    createdAt,
    updatedAt,
    hypothesis: normalizedText(input.hypothesis) ?? undefined,
    currentView: normalizedText(input.currentView) ?? undefined,
    tags: normalizedTags(input.tags),
  }
}

export function readInvestigationThesis(params: Pick<URLSearchParams, "get">) {
  if (params.get("thesisVersion") !== String(INVESTIGATION_THESIS_VERSION)) return undefined
  const thesisId = normalizedText(params.get("thesisId"))
  const title = normalizedText(params.get("thesisTitle"))
  const question = normalizedText(params.get("thesisQuestion"))
  const decisionHorizon = normalizedText(params.get("decisionHorizon"))
  const status = normalizedStatus(params.get("thesisStatus"))
  const createdAt = normalizedTimestamp(params.get("thesisCreatedAt"))
  const updatedAt = normalizedTimestamp(params.get("thesisUpdatedAt"))
  if (!thesisId || !title || !question || !decisionHorizon || !status || !createdAt || !updatedAt) {
    return undefined
  }

  return createInvestigationThesis({
    thesisId,
    title,
    question,
    decisionHorizon,
    status,
    createdAt,
    updatedAt,
    hypothesis: params.get("thesisHypothesis") ?? undefined,
    currentView: params.get("thesisView") ?? undefined,
    tags: params.get("thesisTags")?.split(","),
  })
}

export function appendInvestigationThesisParams(params: URLSearchParams, thesis?: InvestigationThesis) {
  if (!thesis) return params
  params.set("thesisVersion", String(thesis.thesisVersion))
  params.set("thesisId", thesis.thesisId)
  params.set("thesisTitle", thesis.title)
  params.set("thesisQuestion", thesis.question)
  params.set("decisionHorizon", thesis.decisionHorizon)
  params.set("thesisStatus", thesis.status)
  params.set("thesisCreatedAt", thesis.createdAt)
  params.set("thesisUpdatedAt", thesis.updatedAt)
  if (thesis.hypothesis) params.set("thesisHypothesis", thesis.hypothesis)
  if (thesis.currentView) params.set("thesisView", thesis.currentView)
  if (thesis.tags?.length) params.set("thesisTags", thesis.tags.join(","))
  return params
}

export function withInvestigationThesisView(
  thesis: InvestigationThesis | undefined,
  currentView: string,
) {
  return thesis ? { ...thesis, currentView } : undefined
}
