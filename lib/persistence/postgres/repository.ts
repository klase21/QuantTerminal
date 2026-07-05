import { createPersistenceRepository, type PersistenceRepository } from "@/lib/persistence/repository"
import { PostgresStorageAdapter } from "@/lib/persistence/postgres/adapter"

export function createPostgresPersistenceRepository(
  connectionString: string,
): PersistenceRepository {
  return createPersistenceRepository(new PostgresStorageAdapter(connectionString))
}
