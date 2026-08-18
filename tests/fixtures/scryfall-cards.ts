/**
 * Scryfall card fixtures for MSW + unit tests.
 * Never hit api.scryfall.com in CI.
 */

import type { ScryfallCard } from "@/lib/scryfall/types";

export const FIXTURE_SOL_RING: ScryfallCard = {
  object: "card",
  id: "a1111111-1111-4111-8111-111111111111",
  oracle_id: "b2222222-2222-4222-8222-222222222222",
  name: "Sol Ring",
  mana_cost: "{1}",
  cmc: 1,
  type_line: "Artifact",
  oracle_text: "{T}: Add {C}{C}.",
  colors: [],
  color_identity: [],
  keywords: [],
  layout: "normal",
  set: "c21",
  set_name: "Commander 2021",
  collector_number: "263",
  rarity: "uncommon",
  image_uris: {
    small: "https://cards.scryfall.io/small/front/a/1/sol-ring.jpg",
    normal: "https://cards.scryfall.io/normal/front/a/1/sol-ring.jpg",
    large: "https://cards.scryfall.io/large/front/a/1/sol-ring.jpg",
  },
  scryfall_uri: "https://scryfall.com/card/c21/263/sol-ring",
  purchase_uris: {
    tcgplayer: "https://www.tcgplayer.com/product/123",
  },
  prices: { usd: "1.50", usd_foil: "3.00", eur: "1.20", eur_foil: "2.50" },
};

/** Transform DFC — Delver of Secrets // Insectile Aberration style. */
export const FIXTURE_TRANSFORM_DFC: ScryfallCard = {
  object: "card",
  id: "c3333333-3333-4333-8333-333333333333",
  oracle_id: "d4444444-4444-4444-8444-444444444444",
  name: "Delver of Secrets // Insectile Aberration",
  mana_cost: "",
  cmc: 1,
  type_line: "Creature — Human Wizard // Creature — Human Insect",
  colors: ["U"],
  color_identity: ["U"],
  keywords: ["Transform"],
  layout: "transform",
  set: "isd",
  set_name: "Innistrad",
  collector_number: "51",
  rarity: "uncommon",
  scryfall_uri:
    "https://scryfall.com/card/isd/51/delver-of-secrets-insectile-aberration",
  card_faces: [
    {
      name: "Delver of Secrets",
      mana_cost: "{U}",
      type_line: "Creature — Human Wizard",
      oracle_text:
        "At the beginning of your upkeep, look at the top card of your library. You may reveal that card. If an instant or sorcery card is revealed this way, transform Delver of Secrets.",
      image_uris: {
        small: "https://cards.scryfall.io/small/front/c/3/delver.jpg",
        normal: "https://cards.scryfall.io/normal/front/c/3/delver.jpg",
        large: "https://cards.scryfall.io/large/front/c/3/delver.jpg",
      },
    },
    {
      name: "Insectile Aberration",
      mana_cost: "",
      type_line: "Creature — Human Insect",
      oracle_text: "Flying",
      image_uris: {
        small: "https://cards.scryfall.io/small/back/c/3/insectile.jpg",
        normal: "https://cards.scryfall.io/normal/back/c/3/insectile.jpg",
        large: "https://cards.scryfall.io/large/back/c/3/insectile.jpg",
      },
    },
  ],
};

/** Modal DFC (e.g. Bonecrusher Giant style adventure is separate — this is MDFC). */
export const FIXTURE_MODAL_DFC: ScryfallCard = {
  object: "card",
  id: "e5555555-5555-4555-8555-555555555555",
  oracle_id: "f6666666-6666-4666-8666-666666666666",
  name: "Jwari Disruption // Jwari Ruins",
  cmc: 1,
  type_line: "Instant // Land",
  color_identity: ["U"],
  keywords: [],
  layout: "modal_dfc",
  set: "znr",
  set_name: "Zendikar Rising",
  collector_number: "64",
  rarity: "uncommon",
  scryfall_uri: "https://scryfall.com/card/znr/64/jwari-disruption-jwari-ruins",
  card_faces: [
    {
      name: "Jwari Disruption",
      mana_cost: "{1}{U}",
      type_line: "Instant",
      oracle_text: "Counter target spell unless its controller pays {1}.",
      colors: ["U"],
      image_uris: {
        small: "https://cards.scryfall.io/small/front/e/5/jwari.jpg",
        normal: "https://cards.scryfall.io/normal/front/e/5/jwari.jpg",
      },
    },
    {
      name: "Jwari Ruins",
      type_line: "Land",
      oracle_text: "Jwari Ruins enters the battlefield tapped.\n{T}: Add {U}.",
      colors: [],
      image_uris: {
        small: "https://cards.scryfall.io/small/back/e/5/jwari-ruins.jpg",
        normal: "https://cards.scryfall.io/normal/back/e/5/jwari-ruins.jpg",
      },
    },
  ],
};

/** Adventure card — Bonecrusher Giant // Stomp. */
export const FIXTURE_ADVENTURE: ScryfallCard = {
  object: "card",
  id: "a7777777-7777-4777-8777-777777777777",
  oracle_id: "b8888888-8888-4888-8888-888888888888",
  name: "Bonecrusher Giant // Stomp",
  mana_cost: "",
  cmc: 3,
  type_line: "Creature — Giant // Instant — Adventure",
  colors: ["R"],
  color_identity: ["R"],
  keywords: [],
  layout: "adventure",
  set: "eld",
  set_name: "Throne of Eldraine",
  collector_number: "115",
  rarity: "rare",
  image_uris: {
    small: "https://cards.scryfall.io/small/front/a/7/bonecrusher.jpg",
    normal: "https://cards.scryfall.io/normal/front/a/7/bonecrusher.jpg",
    large: "https://cards.scryfall.io/large/front/a/7/bonecrusher.jpg",
  },
  scryfall_uri: "https://scryfall.com/card/eld/115/bonecrusher-giant-stomp",
  card_faces: [
    {
      name: "Bonecrusher Giant",
      mana_cost: "{2}{R}",
      type_line: "Creature — Giant",
      oracle_text:
        "Whenever Bonecrusher Giant becomes the target of a spell, Bonecrusher Giant deals 2 damage to that spell's controller.",
    },
    {
      name: "Stomp",
      mana_cost: "{1}{R}",
      type_line: "Instant — Adventure",
      oracle_text:
        "Damage can't be prevented this turn. Stomp deals 2 damage to any target.",
    },
  ],
};

/** Card with no images at all. */
export const FIXTURE_NO_IMAGE: ScryfallCard = {
  object: "card",
  id: "c9999999-9999-4999-8999-999999999999",
  oracle_id: "d0000000-0000-4000-8000-000000000000",
  name: "Nameless Race",
  mana_cost: "{3}",
  cmc: 3,
  type_line: "Creature",
  oracle_text: "Trample",
  colors: [],
  color_identity: [],
  keywords: ["Trample"],
  layout: "normal",
  set: "drk",
  set_name: "The Dark",
  collector_number: "10",
  rarity: "rare",
  scryfall_uri: "https://scryfall.com/card/drk/10/nameless-race",
};

/** Minimal fields — exercises defaults. */
export const FIXTURE_MINIMAL: ScryfallCard = {
  object: "card",
  id: "eaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Bare Bones",
};

export const FIXTURE_CARDS: ScryfallCard[] = [
  FIXTURE_SOL_RING,
  FIXTURE_TRANSFORM_DFC,
  FIXTURE_MODAL_DFC,
  FIXTURE_ADVENTURE,
  FIXTURE_NO_IMAGE,
];

/** Empty list response. */
export const FIXTURE_EMPTY_SEARCH = {
  object: "list" as const,
  total_cards: 0,
  has_more: false,
  data: [] as ScryfallCard[],
};

/** Corrupt / unexpected payload (missing data array). */
export const FIXTURE_CORRUPT_SEARCH = {
  object: "list" as const,
  total_cards: 1,
  has_more: false,
};
