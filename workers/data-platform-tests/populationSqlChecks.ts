import { readFileSync } from "node:fs"
import path from "node:path"
import { D3_POPULATION_MIGRATION_ORDER, D3_POPULATION_TABLES } from "@/lib/data-platform/population/postgres"

const root = path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "migrations")
const names = [...D3_POPULATION_MIGRATION_ORDER]
const sql = names.map((name) => readFileSync(path.join(root, name), "utf8")).join("\n")
export const migrationNamesValid = names.every((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)) && new Set(names.map((name) => name.slice(0, 3))).size === names.length
export const requiredTablesPresent = D3_POPULATION_TABLES.every((table) => sql.includes(`CREATE TABLE ${table}`))
export const fencingRequired = sql.includes("current_fencing_token bigint NOT NULL") && sql.includes("STALE_FENCING_TOKEN") && sql.includes("FOR UPDATE SKIP LOCKED")
export const candidateSubmissionUnique = sql.includes("candidate_id text NOT NULL UNIQUE REFERENCES population.candidates")
export const appendOnlyHistoryPresent = sql.includes("population_job_events") && sql.includes("population_run_events") && sql.includes("population_unit_events")
export const rawBytesExcluded = !/raw_bytes\s+(bytea|blob)/i.test(sql)
export const d2MigrationsUntouchedByOrder = names.length === 3 && names[0] === "001_population_control_plane.sql" && names[1] === "002_population_roles.sql" && names[2] === "003_agg_trade_candidates.sql"
export const supersessionNotLineage = !sql.includes("SUPERSEDES")
