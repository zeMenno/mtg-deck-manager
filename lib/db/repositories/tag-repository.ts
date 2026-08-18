import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import {
  buildDefaultTags,
  TAGS_SEED_VERSION,
} from "@/lib/db/seed/default-tags";
import { nowIso } from "@/lib/db/ids";
import type { TagCategory } from "@/types";
import type { Tag } from "@/types/card";

export class TagRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async getAll(): Promise<Tag[]> {
    return this.database.tags.toArray();
  }

  async getByCategory(category: TagCategory): Promise<Tag[]> {
    return this.listByCategory(category);
  }

  async listByCategory(category: TagCategory): Promise<Tag[]> {
    const rows = await this.database.tags
      .where("category")
      .equals(category)
      .toArray();
    return rows.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }

  async getById(id: string): Promise<Tag | undefined> {
    return this.database.tags.get(id);
  }

  async getByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    const rows = await this.database.tags.bulkGet([...new Set(ids)]);
    return rows.filter((row): row is Tag => row !== undefined);
  }

  async create(tag: Omit<Tag, "id"> & { id?: string }): Promise<Tag> {
    const record: Tag = {
      ...tag,
      id: tag.id ?? `custom.${crypto.randomUUID()}`,
    };
    await this.database.tags.add(record);
    return record;
  }

  /**
   * Seeds the default role/synergy catalog when the tags table is empty.
   * Idempotent: no-ops if any tags already exist.
   */
  async seedDefaults(): Promise<{ seeded: boolean; count: number }> {
    const count = await this.database.tags.count();
    if (count > 0) {
      return { seeded: false, count };
    }

    const defaults = buildDefaultTags();
    await this.database.tags.bulkAdd(defaults);
    await this.database.appMeta.put({
      key: "tagsSeededVersion",
      value: TAGS_SEED_VERSION,
      updatedAt: nowIso(),
    });
    return { seeded: true, count: defaults.length };
  }
}
