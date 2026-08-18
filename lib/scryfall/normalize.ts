/**
 * Normalize Scryfall card payloads into the local `Card` model.
 *
 * Identity rules (do not change without updating Phase 5 consumers):
 * - `Card.id`       = Scryfall printing UUID (`id`)
 * - `Card.oracleId` = Scryfall `oracle_id` (logical card across printings)
 *
 * Always resolve deck cards via printing id; use oracleId for identity checks.
 */

import type { ScryfallCard, ScryfallCardFace } from "@/lib/scryfall/types";
import type { Card, CardFace, CardLegality } from "@/types/card";
import type { DeckFormat } from "@/types/index";

const MULTI_FACE_LAYOUTS = new Set([
  "transform",
  "modal_dfc",
  "double_faced_token",
  "art_series",
  "reversible_card",
  "split",
  "flip",
  "adventure",
]);

function pickImages(
  uris: ScryfallCard["image_uris"] | ScryfallCardFace["image_uris"] | undefined,
): Pick<Card, "imageSmall" | "imageNormal" | "imageLarge"> {
  if (!uris) return {};
  return {
    imageSmall: uris.small,
    imageNormal: uris.normal,
    imageLarge: uris.large,
  };
}

function normalizeFace(face: ScryfallCardFace): CardFace {
  const images = pickImages(face.image_uris);
  return {
    name: face.name,
    manaCost: face.mana_cost || undefined,
    typeLine: face.type_line || undefined,
    oracleText: face.oracle_text || undefined,
    ...images,
  };
}

function primaryFace(raw: ScryfallCard): ScryfallCardFace | undefined {
  return raw.card_faces?.[0];
}

function mapLegalities(
  legalities: ScryfallCard["legalities"],
): Card["legalities"] | undefined {
  if (!legalities) return undefined;
  const out: Partial<Record<DeckFormat, CardLegality>> = {};
  const allowed: CardLegality[] = [
    "legal",
    "not_legal",
    "banned",
    "restricted",
  ];
  for (const [format, value] of Object.entries(legalities)) {
    if (allowed.includes(value as CardLegality)) {
      out[format as DeckFormat] = value as CardLegality;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Convert a Scryfall card object into the Dexie `Card` shape.
 */
export function normalizeScryfallCard(raw: ScryfallCard): Card {
  const face = primaryFace(raw);
  const layout = raw.layout ?? "normal";
  const isMultiFace =
    Array.isArray(raw.card_faces) &&
    raw.card_faces.length > 1 &&
    (MULTI_FACE_LAYOUTS.has(layout) || raw.card_faces.length > 1);

  // Top-level fields may be absent on DFCs — fall back to front face.
  const name = raw.name || face?.name || "Unknown Card";
  const manaCost = raw.mana_cost || face?.mana_cost || undefined;
  const typeLine = raw.type_line || face?.type_line || "";
  const oracleText = raw.oracle_text || face?.oracle_text || undefined;
  const colors = raw.colors ?? face?.colors ?? [];
  const images = pickImages(raw.image_uris ?? face?.image_uris);

  const faces: CardFace[] | undefined =
    isMultiFace && raw.card_faces
      ? raw.card_faces.map(normalizeFace)
      : undefined;

  // oracle_id can be missing on some tokens; fall back to printing id so Dexie
  // always has a non-empty oracleId for indexing / identity checks.
  const oracleId = raw.oracle_id || raw.id;

  return {
    id: raw.id,
    oracleId,
    name,
    manaCost,
    manaValue: typeof raw.cmc === "number" ? raw.cmc : 0,
    typeLine,
    oracleText,
    colors,
    colorIdentity: raw.color_identity ?? [],
    keywords: raw.keywords ?? [],
    setCode: raw.set,
    setName: raw.set_name,
    collectorNumber: raw.collector_number,
    rarity: raw.rarity,
    ...images,
    scryfallUri: raw.scryfall_uri,
    tcgplayerUri: raw.purchase_uris?.tcgplayer,
    legalities: mapLegalities(raw.legalities),
    layout,
    faces,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeScryfallCards(raw: ScryfallCard[]): Card[] {
  return raw.map(normalizeScryfallCard);
}
