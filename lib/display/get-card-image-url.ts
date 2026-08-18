import {
  SCRYFALL_IMAGE_HOSTS,
  SIZE_TO_URL_TIER,
} from "@/lib/display/constants";
import type { CardImageSize, CardImageUrlTier } from "@/lib/display/types";
import type { Card, CardFace } from "@/types/card";

type ImageFields = {
  imageSmall?: string;
  imageNormal?: string;
  imageLarge?: string;
};

function pickFromFields(
  fields: ImageFields | undefined,
  tier: CardImageUrlTier,
): string | undefined {
  if (!fields) return undefined;
  if (tier === "small") {
    return fields.imageSmall ?? fields.imageNormal ?? fields.imageLarge;
  }
  if (tier === "normal") {
    return fields.imageNormal ?? fields.imageLarge ?? fields.imageSmall;
  }
  return fields.imageLarge ?? fields.imageNormal ?? fields.imageSmall;
}

/** Only allow known Scryfall CDN hosts. */
export function isAllowedCardImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return SCRYFALL_IMAGE_HOSTS.some((host) => url.startsWith(host));
}

/**
 * Resolve a Scryfall image URL for a card (front face by default).
 * Falls back across size tiers; returns undefined when no URL is available.
 */
export function getCardImageUrl(
  card: Pick<Card, "imageSmall" | "imageNormal" | "imageLarge" | "faces">,
  size: CardImageSize = "sm",
  faceIndex = 0,
): string | undefined {
  const tier = SIZE_TO_URL_TIER[size];
  const faces = card.faces;
  const face: CardFace | undefined =
    faces && faces.length > 0 ? faces[faceIndex] : undefined;

  const fromFace = pickFromFields(face, tier);
  if (isAllowedCardImageUrl(fromFace)) return fromFace;

  const fromRoot = pickFromFields(card, tier);
  if (isAllowedCardImageUrl(fromRoot)) return fromRoot;

  return undefined;
}

export function getCardImageUrlForTier(
  card: Pick<Card, "imageSmall" | "imageNormal" | "imageLarge" | "faces">,
  tier: CardImageUrlTier,
  faceIndex = 0,
): string | undefined {
  const size: CardImageSize =
    tier === "small" ? "sm" : tier === "normal" ? "md" : "lg";
  return getCardImageUrl(card, size, faceIndex);
}
