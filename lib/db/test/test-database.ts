/**
 * Test-only Dexie helpers. Prefer `tests/helpers/db-test-utils.ts` in Vitest.
 */

import {
  DB_NAME,
  DeckBuilderDatabase,
  deleteDatabase,
  resetDatabaseSingleton,
} from "@/lib/db/database";

export async function createTestDatabase(
  name = `${DB_NAME}-test-${crypto.randomUUID()}`,
): Promise<DeckBuilderDatabase> {
  const database = new DeckBuilderDatabase(name);
  await database.open();
  return database;
}

export async function destroyTestDatabase(
  database: DeckBuilderDatabase,
): Promise<void> {
  const name = database.name;
  database.close();
  await deleteDatabase(name);
  await resetDatabaseSingleton();
}

export { DeckBuilderDatabase };
