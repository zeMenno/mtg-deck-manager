import {
  APP_SCHEMA_VERSION,
  type DeckBuilderDatabase,
} from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import { TagRepository } from "@/lib/db/repositories";

export type InitDatabaseResult = {
  schemaVersion: number;
  tagsSeeded: boolean;
  firstRun: boolean;
};

/**
 * Open the DB, seed default tags if empty, and record schemaVersion / firstRunAt.
 */
export async function initializeDatabase(
  database: DeckBuilderDatabase = getDatabase(),
): Promise<InitDatabaseResult> {
  await database.open();

  const existingVersion = await database.appMeta.get("schemaVersion");
  const firstRun = existingVersion === undefined;

  if (firstRun) {
    const timestamp = nowIso();
    await database.appMeta.put({
      key: "schemaVersion",
      value: APP_SCHEMA_VERSION,
      updatedAt: timestamp,
    });
    await database.appMeta.put({
      key: "firstRunAt",
      value: timestamp,
      updatedAt: timestamp,
    });
  } else if (existingVersion.value !== APP_SCHEMA_VERSION) {
    await database.appMeta.put({
      key: "schemaVersion",
      value: APP_SCHEMA_VERSION,
      updatedAt: nowIso(),
    });
  }

  const tagRepo = new TagRepository(database);
  const { seeded } = await tagRepo.seedDefaults();

  return {
    schemaVersion: APP_SCHEMA_VERSION,
    tagsSeeded: seeded,
    firstRun,
  };
}
