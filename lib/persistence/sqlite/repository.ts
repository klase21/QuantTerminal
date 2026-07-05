import { createPersistenceRepository, type PersistenceRepository } from "@/lib/persistence/repository"
import { SQLiteStorageAdapter } from "@/lib/persistence/sqlite/adapter"

export function createSQLitePersistenceRepository(
  databasePath: string,
): PersistenceRepository {
  return createPersistenceRepository(new SQLiteStorageAdapter(databasePath))
}
