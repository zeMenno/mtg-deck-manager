/**
 * Version service — save, restore, compare, rename, delete (Phase 11).
 * UI must never touch Dexie deckVersions directly.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { createId, nowIso } from "@/lib/db/ids";
import { DeckRepository } from "@/lib/db/repositories";
import { DeckVersionRepository } from "@/lib/db/repositories/deck-version-repository";
import { MAX_VERSIONS_PER_DECK } from "@/lib/versions/constants";
import { diffSnapshots } from "@/lib/versions/diff";
import {
  applySnapshot,
  captureSnapshot,
  suggestVersionName,
} from "@/lib/versions/snapshot";
import type { SaveVersionInput, VersionDiff } from "@/lib/versions/types";
import { VersionLimitError } from "@/lib/versions/types";
import type { DeckVersion } from "@/types/deck";

export class VersionService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly versions = new DeckVersionRepository(database),
    private readonly decks = new DeckRepository(database),
  ) {}

  async listVersions(deckId: string): Promise<DeckVersion[]> {
    return this.versions.listByDeckId(deckId, { order: "desc" });
  }

  async getVersion(versionId: string): Promise<DeckVersion | undefined> {
    return this.versions.getById(versionId);
  }

  async suggestName(deckId: string): Promise<string> {
    const count = await this.versions.countByDeckId(deckId);
    return suggestVersionName(count);
  }

  async saveVersion(
    deckId: string,
    input: SaveVersionInput,
  ): Promise<DeckVersion> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Version name is required");
    }

    const deck = await this.decks.getById(deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    const count = await this.versions.countByDeckId(deckId);
    if (count >= MAX_VERSIONS_PER_DECK) {
      if (!input.pruneOldest) {
        throw new VersionLimitError(deckId, MAX_VERSIONS_PER_DECK, count);
      }
      const oldest = await this.versions.getOldest(deckId);
      if (oldest) {
        await this.deleteVersion(oldest.id);
      }
    }

    const snapshot = await captureSnapshot(deckId, this.database);
    const version: DeckVersion = {
      id: createId(),
      deckId,
      name,
      createdAt: nowIso(),
      snapshot,
      ...(input.notes !== undefined && input.notes.trim()
        ? { notes: input.notes.trim() }
        : {}),
    };

    await this.database.transaction(
      "rw",
      this.database.deckVersions,
      this.database.decks,
      async () => {
        await this.versions.create(version);
        await this.decks.update(deckId, {
          activeVersionId: version.id,
          updatedAt: version.createdAt,
        });
      },
    );

    return version;
  }

  async restoreVersion(deckId: string, versionId: string): Promise<void> {
    const version = await this.versions.getById(versionId);
    if (!version) {
      throw new Error(`DeckVersion not found: ${versionId}`);
    }
    if (version.deckId !== deckId) {
      throw new Error("Version does not belong to this deck");
    }

    await applySnapshot(deckId, version.snapshot, this.database, {
      activeVersionId: version.id,
      updatedAt: version.createdAt,
    });
  }

  async compareVersions(aId: string, bId: string): Promise<VersionDiff> {
    const [a, b] = await Promise.all([
      this.versions.getById(aId),
      this.versions.getById(bId),
    ]);
    if (!a) throw new Error(`DeckVersion not found: ${aId}`);
    if (!b) throw new Error(`DeckVersion not found: ${bId}`);
    return diffSnapshots(a.snapshot, b.snapshot);
  }

  async compareVersionToCurrent(
    deckId: string,
    versionId: string,
  ): Promise<VersionDiff> {
    const version = await this.versions.getById(versionId);
    if (!version) {
      throw new Error(`DeckVersion not found: ${versionId}`);
    }
    if (version.deckId !== deckId) {
      throw new Error("Version does not belong to this deck");
    }
    const current = await captureSnapshot(deckId, this.database);
    return diffSnapshots(version.snapshot, current);
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.versions.getById(versionId);
    if (!version) return;

    await this.database.transaction(
      "rw",
      this.database.deckVersions,
      this.database.decks,
      async () => {
        await this.versions.delete(versionId);
        const deck = await this.decks.getById(version.deckId);
        if (deck?.activeVersionId === versionId) {
          await this.decks.update(version.deckId, {
            activeVersionId: undefined,
          });
        }
      },
    );
  }

  async renameVersion(
    versionId: string,
    name: string,
    notes?: string,
  ): Promise<DeckVersion> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Version name is required");
    }
    const patch: Partial<Pick<DeckVersion, "name" | "notes">> = {
      name: trimmed,
    };
    if (notes !== undefined) {
      patch.notes = notes.trim() || undefined;
    }
    return this.versions.update(versionId, patch);
  }
}

export const versionService = new VersionService();
