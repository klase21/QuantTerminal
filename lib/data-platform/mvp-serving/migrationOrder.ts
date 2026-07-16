export const MVP_SERVING_MIGRATION_ORDER = Object.freeze([
  "001_mvp_serving_schema.sql",
  "002_reader_role_hardening.sql",
  "003_inactive_candidate_membership.sql",
] as const)

export const MVP_SERVING_CERTIFIED_LEGACY_CHECKSUMS: Readonly<Record<string, { readonly repositoryChecksum: string; readonly appliedChecksums: readonly string[] }>> = Object.freeze({
  "001": Object.freeze({ repositoryChecksum: "b28b489343695c5fbf3759280beaf3bb8d20c26f0c6604bbfa4daaef647b5cfb", appliedChecksums: Object.freeze(["be6be8c65337e238caa105d5a3ae72956bce998ebd42494b45a7f174cdfada3b"]) }),
})
