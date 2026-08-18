/**
 * Validate an unknown JSON value as an AppBackup before any DB write.
 */

import { AppBackupSchema } from "@/lib/import-export/backup-schema";
import { CURRENT_BACKUP_VERSION } from "@/lib/import-export/backup-version";
import type {
  AppBackup,
  AppBackupData,
  ValidationIssue,
  ValidationResult,
} from "@/lib/import-export/types";

function issue(
  path: string,
  message: string,
  severity: ValidationIssue["severity"] = "error",
): ValidationIssue {
  return { path, message, severity };
}

/**
 * Normalize legacy Phase 3 backups (missing appMeta / versionCount) into
 * the Phase 10 shape before Zod parse when possible.
 */
export function normalizeLegacyBackupShape(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  const data =
    typeof obj.data === "object" && obj.data !== null
      ? { ...(obj.data as Record<string, unknown>) }
      : null;

  if (data) {
    if (!Array.isArray(data.appMeta)) {
      data.appMeta = [];
    }
    obj.data = data;
  }

  if (typeof obj.metadata === "object" && obj.metadata !== null) {
    const meta = { ...(obj.metadata as Record<string, unknown>) };
    if (meta.versionCount === undefined) {
      const versions = Array.isArray(data?.deckVersions)
        ? data.deckVersions.length
        : 0;
      meta.versionCount = versions;
    }
    if (
      meta.wishlistItemCount === undefined &&
      typeof meta.wishlistCount === "number"
    ) {
      meta.wishlistItemCount = meta.wishlistCount;
    }
    if (meta.wishlistItemCount === undefined) {
      const items = Array.isArray(data?.wishlistItems)
        ? data.wishlistItems.length
        : 0;
      meta.wishlistItemCount = items;
    }
    obj.metadata = meta;
  }

  return obj;
}

function checkReferentialIntegrity(data: AppBackupData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const deckIds = new Set(data.decks.map((d) => d.id));
  const cardIds = new Set(data.cards.map((c) => c.id));
  const deckCardIds = new Set(data.deckCards.map((dc) => dc.id));

  for (const [index, deckCard] of data.deckCards.entries()) {
    if (!deckIds.has(deckCard.deckId)) {
      issues.push(
        issue(
          `data.deckCards[${index}].deckId`,
          `deckCard references missing deck "${deckCard.deckId}"`,
        ),
      );
    }
    if (!cardIds.has(deckCard.cardId)) {
      issues.push(
        issue(
          `data.deckCards[${index}].cardId`,
          `deckCard references card "${deckCard.cardId}" not present in backup — will need Scryfall resolution`,
          "warning",
        ),
      );
    }
    if (
      deckCard.replacesDeckCardId &&
      !deckCardIds.has(deckCard.replacesDeckCardId)
    ) {
      issues.push(
        issue(
          `data.deckCards[${index}].replacesDeckCardId`,
          `replacesDeckCardId "${deckCard.replacesDeckCardId}" not found`,
          "warning",
        ),
      );
    }
  }

  for (const [index, version] of data.deckVersions.entries()) {
    if (!deckIds.has(version.deckId)) {
      issues.push(
        issue(
          `data.deckVersions[${index}].deckId`,
          `deckVersion references missing deck "${version.deckId}"`,
        ),
      );
    }
  }

  for (const [index, price] of data.cardPrices.entries()) {
    if (!cardIds.has(price.cardId)) {
      issues.push(
        issue(
          `data.cardPrices[${index}].cardId`,
          `cardPrice references missing card "${price.cardId}"`,
          "warning",
        ),
      );
    }
  }

  for (const [index, item] of data.wishlistItems.entries()) {
    if (!cardIds.has(item.cardId)) {
      issues.push(
        issue(
          `data.wishlistItems[${index}].cardId`,
          `wishlistItem references missing card "${item.cardId}"`,
          "warning",
        ),
      );
    }
    if (item.targetDeckId && !deckIds.has(item.targetDeckId)) {
      issues.push(
        issue(
          `data.wishlistItems[${index}].targetDeckId`,
          `wishlistItem targetDeckId "${item.targetDeckId}" not found`,
          "warning",
        ),
      );
    }
  }

  return issues;
}

/**
 * Validate backup JSON. Never mutates the database.
 */
export function validateBackup(raw: unknown): ValidationResult {
  if (raw === null || raw === undefined) {
    return {
      ok: false,
      errors: [issue("", "Backup file is empty")],
      warnings: [],
    };
  }

  if (typeof raw === "object" && raw !== null && "backupVersion" in raw) {
    const version = (raw as { backupVersion: unknown }).backupVersion;
    if (typeof version === "number" && version > CURRENT_BACKUP_VERSION) {
      return {
        ok: false,
        errors: [
          issue(
            "backupVersion",
            `Backup from a newer app version (v${version}). Please update the app and try again.`,
          ),
        ],
        warnings: [],
      };
    }
    if (typeof version === "number" && version < 1) {
      return {
        ok: false,
        errors: [
          issue("backupVersion", `Unsupported backupVersion ${version}`),
        ],
        warnings: [],
      };
    }
    if (typeof version === "number" && version !== CURRENT_BACKUP_VERSION) {
      return {
        ok: false,
        errors: [
          issue(
            "backupVersion",
            `Unsupported backupVersion ${version}. This app supports version ${CURRENT_BACKUP_VERSION}.`,
          ),
        ],
        warnings: [],
      };
    }
  }

  const normalized = normalizeLegacyBackupShape(raw);
  const parsed = AppBackupSchema.safeParse(normalized);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((zodIssue) =>
      issue(zodIssue.path.join(".") || "(root)", zodIssue.message),
    );
    return { ok: false, errors, warnings: [] };
  }

  const backup = parsed.data as unknown as AppBackup;
  // Ensure metadata counts are populated for UI preview.
  backup.metadata = {
    deckCount: backup.metadata.deckCount,
    cardCount: backup.metadata.cardCount,
    versionCount:
      backup.metadata.versionCount ?? backup.data.deckVersions.length,
    wishlistItemCount:
      backup.metadata.wishlistItemCount ??
      backup.metadata.wishlistCount ??
      backup.data.wishlistItems.length,
  };
  if (!Array.isArray(backup.data.appMeta)) {
    backup.data.appMeta = [];
  }

  const refIssues = checkReferentialIntegrity(backup.data);
  const errors = refIssues.filter((i) => i.severity === "error");
  const warnings = refIssues.filter((i) => i.severity === "warning");

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return { ok: true, backup, warnings };
}

/**
 * Fast structural check used by legacy callers / tests.
 */
export function isAppBackupShape(value: unknown): value is AppBackup {
  const result = validateBackup(value);
  return result.ok;
}
