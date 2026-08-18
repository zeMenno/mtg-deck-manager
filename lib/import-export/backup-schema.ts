/**
 * Zod schemas for AppBackup / DeckExport validation (Phase 10).
 * Structural checks only — referential integrity lives in validate-backup.ts.
 */

import { z } from "zod";

import { CURRENT_BACKUP_VERSION } from "@/lib/import-export/backup-version";

const isoString = z.string().min(1);

const deckCardStatus = z.enum(["current", "add", "cut", "consider"]);
const deckCardZone = z.enum([
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
]);
const deckFormat = z.enum([
  "commander",
  "standard",
  "modern",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
  "other",
]);

/** Loose entity row — requires id (or key) and rejects binary blobs. */
const noBinary = z.record(z.string(), z.unknown()).superRefine((obj, ctx) => {
  for (const [key, value] of Object.entries(obj)) {
    if (
      typeof value === "string" &&
      value.startsWith("data:image") &&
      value.length > 256
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Unexpected binary image field "${key}" — backups must not embed images`,
        path: [key],
      });
    }
  }
});

const deckSchema = noBinary.and(
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    format: deckFormat,
    createdAt: isoString,
    updatedAt: isoString,
  }),
);

const deckCardSchema = noBinary.and(
  z.object({
    id: z.string().min(1),
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    quantity: z.number().int().positive(),
    zone: deckCardZone,
    status: deckCardStatus,
    roles: z.array(z.string()),
    synergies: z.array(z.string()),
    addedAt: isoString,
    updatedAt: isoString,
  }),
);

const deckVersionSchema = noBinary.and(
  z.object({
    id: z.string().min(1),
    deckId: z.string().min(1),
    name: z.string().min(1),
    createdAt: isoString,
    snapshot: z.unknown(),
  }),
);

const cardSchema = noBinary.and(
  z.object({
    id: z.string().min(1),
    oracleId: z.string().min(1),
    name: z.string().min(1),
    manaValue: z.number(),
    typeLine: z.string(),
    colors: z.array(z.string()),
    colorIdentity: z.array(z.string()),
    keywords: z.array(z.string()),
    updatedAt: isoString,
  }),
);

const cardPriceSchema = noBinary.and(
  z.object({
    cardId: z.string().min(1),
    currency: z.enum(["USD", "EUR"]),
    source: z.string().min(1),
    fetchedAt: isoString,
  }),
);

const tagSchema = noBinary.and(
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(["role", "synergy", "custom"]),
  }),
);

const wishlistItemSchema = noBinary.and(
  z.object({
    id: z.string().min(1),
    cardId: z.string().min(1),
    quantity: z.number().int().positive(),
    priority: z.enum(["essential", "high", "medium", "low"]),
    addedAt: isoString,
    updatedAt: isoString,
    targetDeckId: z.string().min(1).optional(),
    targetRole: z.string().min(1).optional(),
    notes: z.string().optional(),
    wishlistId: z.string().min(1).optional(),
  }),
);

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  updatedAt: isoString,
});

const appMetaSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  updatedAt: isoString,
});

export const AppBackupDataSchema = z.object({
  decks: z.array(deckSchema),
  deckCards: z.array(deckCardSchema),
  deckVersions: z.array(deckVersionSchema),
  cards: z.array(cardSchema),
  cardPrices: z.array(cardPriceSchema),
  tags: z.array(tagSchema),
  wishlistItems: z.array(wishlistItemSchema),
  settings: z.array(settingSchema),
  appMeta: z.array(appMetaSchema).default([]),
});

export const AppBackupSchema = z.object({
  backupVersion: z.literal(CURRENT_BACKUP_VERSION),
  appSchemaVersion: z.number().int().nonnegative(),
  exportedAt: isoString,
  exportedFrom: z
    .object({
      appVersion: z.string().optional(),
      userAgent: z.string().optional(),
      appUrl: z.string().optional(),
      displayMode: z.enum(["browser", "standalone"]).optional(),
    })
    .passthrough(),
  metadata: z
    .object({
      deckCount: z.number().int().nonnegative(),
      cardCount: z.number().int().nonnegative(),
      versionCount: z.number().int().nonnegative().optional(),
      wishlistItemCount: z.number().int().nonnegative().optional(),
      wishlistCount: z.number().int().nonnegative().optional(),
    })
    .passthrough(),
  data: AppBackupDataSchema,
});

export const DeckExportSchema = z.object({
  exportVersion: z.literal(1),
  exportedAt: isoString,
  deck: deckSchema,
  deckCards: z.array(deckCardSchema),
  cards: z.array(cardSchema),
  tags: z.array(tagSchema).optional(),
});

export type AppBackupParsed = z.infer<typeof AppBackupSchema>;
export type DeckExportParsed = z.infer<typeof DeckExportSchema>;
