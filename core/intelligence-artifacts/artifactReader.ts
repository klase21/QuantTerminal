import { intelligenceArtifactStatus } from "@/core/intelligence-artifacts/artifactValidation"
import type { IntelligenceArtifactRegistry } from "@/core/intelligence-artifacts/artifactRegistry"
import {
  INTELLIGENCE_ARTIFACT_SCHEMA_VERSION,
  type IntelligenceArtifactQuery,
  type IntelligenceArtifactReadResult,
} from "@/core/intelligence-artifacts/artifactTypes"

export interface IntelligenceArtifactReadOptions {
  includeExpired?: boolean
  includeArchived?: boolean
  expectedSchemaVersion?: number
  now?: Date
}

export class IntelligenceArtifactReader {
  constructor(private readonly registry: IntelligenceArtifactRegistry) {}

  async read<TMetadata extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    options: IntelligenceArtifactReadOptions = {},
  ): Promise<IntelligenceArtifactReadResult<TMetadata>> {
    const artifact = await this.registry.get(id)
    if (!artifact) {
      return { ok: false, state: "not_found", reason: "Intelligence artifact was not found." }
    }

    const expectedSchemaVersion = options.expectedSchemaVersion ?? INTELLIGENCE_ARTIFACT_SCHEMA_VERSION
    if (artifact.schemaVersion !== expectedSchemaVersion) {
      return {
        ok: false,
        state: "version_mismatch",
        reason: `Artifact schema ${artifact.schemaVersion} does not match required schema ${expectedSchemaVersion}.`,
        artifact: artifact as typeof artifact & { metadata: TMetadata },
      }
    }

    const archived = await this.registry.isArchived(id)
    const status = intelligenceArtifactStatus(artifact, { archived, now: options.now })
    if (status === "archived" && !options.includeArchived) {
      return {
        ok: false,
        state: "archived",
        reason: "Intelligence artifact is archived.",
        artifact: artifact as typeof artifact & { metadata: TMetadata },
      }
    }
    if (status === "expired" && !options.includeExpired) {
      return {
        ok: false,
        state: "expired",
        reason: "Intelligence artifact has expired.",
        artifact: artifact as typeof artifact & { metadata: TMetadata },
      }
    }

    return {
      ok: true,
      state: "ready",
      artifact: artifact as typeof artifact & { metadata: TMetadata },
      status,
    }
  }

  search(query: IntelligenceArtifactQuery = {}) {
    return this.registry.search(query)
  }
}
