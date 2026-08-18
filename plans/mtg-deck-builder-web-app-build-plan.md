# MTG Deck Builder & Upgrade Tracker — Full Web App Build Plan

**Status:** Product/engineering plan
**Target:** Mobile-first Single-Page Web App / Progressive Web App (PWA)
**Hosting:** Vercel
**Primary device:** iPhone
**Primary persistence:** Local-first storage on the device
**UI theme:** tweakcn Neo Brutalism
**Recommended stack:** Next.js + React + TypeScript + Tailwind CSS + shadcn/ui + IndexedDB/Dexie

---

## 1. Product Vision

Build a mobile-first Magic: The Gathering deck-building and upgrade-tracking application that feels like a native iPhone app while remaining a web application deployable to Vercel.

The application should allow a user to:

- Maintain multiple MTG decks.
- Import or create decks.
- Track the current state of each deck.
- Mark cards as `CURRENT`, `ADD`, `CUT`, or `CONSIDER`.
- Search the MTG card database.
- View card images, oracle text, mana cost, type line, set, rarity, and other metadata.
- Assign one or more deck roles such as Ramp, Card Draw, Removal, Anthem, Protection, Token Generator, Win Condition, etc.
- Assign synergy tags such as Soldier, Human, Token, +1/+1 Counter, Equipment, Go-Wide, etc.
- Compare the current deck against a proposed upgraded version.
- Calculate the cost of cards that need to be added.
- Show TCGplayer links per card.
- Track available price data through a replaceable pricing provider abstraction.
- View deck statistics and composition.
- Hide/show card images globally to keep long deck views compact.
- Work without an account.
- Save decks locally on the iPhone.
- Export and import deck backups so local data can be recovered or moved to another device.
- Install to the iPhone Home Screen and launch in standalone/app-like mode.
- Work with limited or no connectivity for all locally stored deck-management features.

The long-term goal is to make the application feel closer to a lightweight dedicated MTG deck application than a spreadsheet.

---

## 2. Important Product Decision: Local-First

The application should be designed as **local-first**, not as a cloud app with local caching.

That means:

1. The deck database lives in IndexedDB on the user's device.
2. UI changes are written locally immediately.
3. The app remains usable when offline.
4. Network requests are primarily for card-data refreshes and pricing.
5. There is no mandatory login in the MVP.
6. Data export/import is a first-class feature.

This is particularly suitable for this product because decks are relatively small and do not require a backend database to provide the core value.

### Why IndexedDB instead of localStorage?

Use IndexedDB for the primary data store. It is asynchronous, supports structured records, and scales much better for a collection of decks, cards, settings, history, and cached card metadata.

Use a small wrapper such as **Dexie** rather than directly managing IndexedDB APIs everywhere.

Recommended abstraction:

```text
React UI
   ↓
Application services
   ↓
Repository layer
   ↓
Dexie
   ↓
IndexedDB
```

The UI must never directly manipulate IndexedDB tables.

---

## 3. iPhone / PWA Requirements

The app must behave as a real Home Screen web app on iPhone.

Next.js now documents a built-in PWA approach using a web app manifest, Service Worker support, and Home Screen installation. Safari/WebKit supports standalone Home Screen web apps. urlNext.js PWA Guidehttps://nextjs.org/docs/app/guides/progressive-web-apps urlWebKit Web Apps documentationhttps://webkit.org/blog/17333/webkit-features-in-safari-26-0/

### Required manifest

Create:

```text
app/manifest.ts
```

Define:

- `name`
- `short_name`
- `description`
- `start_url`
- `display: standalone`
- `background_color`
- `theme_color`
- `icons`
- `id`

Use dedicated 192x192 and 512x512 icons at minimum.

### iPhone installation flow

Provide an in-app installation help screen:

```text
Install Deck Builder

1. Tap the Share button in Safari.
2. Choose “Add to Home Screen”.
3. Enable/open the app as a web app where offered.
4. Launch it from your Home Screen.
```

Do not rely only on `beforeinstallprompt` because Safari/iOS does not expose the same installation flow as Chromium browsers. The Next.js PWA documentation explicitly notes that the custom `beforeinstallprompt` flow does not work on Safari iOS. urlNext.js PWA Guidehttps://nextjs.org/docs/app/guides/progressive-web-apps

### Critical iOS storage detail

The installed Home Screen web app has separate website storage from normal Safari browsing. WebKit documents that local storage is not copied from Safari when a web app is installed. urlWebKit Features in Safari 17https://webkit.org/blog/14445/webkit-features-in-safari-17-0/

Therefore the onboarding must explicitly encourage users to install the app before importing/building their first deck, or offer an obvious export/import path.

Recommended onboarding message:

> Install Deck Builder to your Home Screen before you start building decks. This keeps your deck data inside the installed app's local storage.

### Storage recovery

Because the application is intentionally local-first, implement these backup functions from the beginning:

- Export all data as JSON.
- Import a previously exported JSON backup.
- Export one deck only.
- Import one deck only.
- Show last backup timestamp.
- Show local storage/data size where practical.
- Confirm before destructive reset.

Optional future enhancement:

- Encrypted cloud backup.
- Account-based sync.
- Multi-device synchronization.

Do not make cloud sync a dependency of the MVP.

---

## 4. Recommended Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

### State management

Recommended:

- TanStack Query for remote/server state.
- Zustand for transient UI state where useful.
- Dexie for persistent local application data.

Avoid putting the entire application database into a single global React state object.

### Persistence

- IndexedDB
- Dexie

### PWA

- Web App Manifest
- Service Worker
- Workbox or Serwist if advanced caching is required

Next.js documents Serwist as one option for offline support. urlNext.js PWA Guidehttps://nextjs.org/docs/app/guides/progressive-web-apps

### Card data

Use **Scryfall** as the primary MTG card metadata source.

Scryfall provides card data and image resources suitable for this application's card search and display layer. Use their API rather than creating a proprietary card database from scratch.

Reference:

- https://scryfall.com/docs/api
- https://scryfall.com/docs/api/cards

### Pricing

Create a pricing-provider interface instead of tightly coupling the product to one pricing API.

Example:

```ts
interface PricingProvider {
  getPrice(card: CardIdentity): Promise<CardPrice | null>;
}
```

The first implementation can use the most practical currently available price source and retain a TCGplayer URL for purchasing.

TCGplayer API access should **not** be assumed as a prerequisite. TCGplayer's current developer documentation indicates restrictions around new API access, so direct authenticated TCGplayer pricing should be treated as an optional integration rather than a hard dependency.

The application should nevertheless support TCGplayer product URLs wherever a reliable product mapping is available.

### Hosting

- Vercel
- GitHub repository
- Preview deployments per pull request
- Production deployment from main

Vercel provides first-class Next.js support and zero-configuration deployment for Next.js applications. urlVercel — Next.js on Vercelhttps://vercel.com/docs/frameworks/full-stack/nextjs

---

# 5. Visual Design System

## Required theme

Use the exact tweakcn Neo Brutalism theme supplied by:

https://tweakcn.com/r/themes/neo-brutalism.json

The theme defines, among other things:

- DM Sans as the sans font.
- Space Mono as the monospace font.
- Zero-radius surfaces.
- Hard black borders.
- Hard offset shadows.
- Strong yellow, red, blue, pink, and green accents.
- Very high visual contrast.

Reference theme values are available directly in the supplied JSON. urlNeo Brutalism theme JSONhttps://tweakcn.com/r/themes/neo-brutalism.json

### Theme principles

Do not dilute the theme by building a generic rounded SaaS interface on top of it.

Use:

- Square/zero-radius controls.
- Thick borders.
- Offset black shadows.
- Large bold typography.
- High-contrast call-to-actions.
- Color-coded statuses.
- Strong card imagery.
- Dense information where appropriate.

Avoid:

- Excessive glassmorphism.
- Soft floating shadows.
- Excessive gradients.
- Overuse of rounded cards.
- Tiny mobile controls.

### Design system tokens

Import the tweakcn theme variables as the source of truth.

Do not manually recreate a second unrelated color system.

Create semantic application tokens on top of the theme:

```text
current   → primary/neutral treatment
add       → success/green treatment
cut       → destructive/red treatment
consider  → secondary/yellow treatment
commander → accent/blue treatment
warning   → yellow/black treatment
```

### Card-image presentation

Card images should be visually dominant but optional.

Provide a global control:

```text
Images: ON / OFF
```

Also provide density modes:

- Compact
- Comfortable
- Image

Persist the selected density mode locally.

---

# 6. Information Architecture

Recommended primary navigation:

```text
Home
Decks
Cards
Wishlist
Settings
```

For mobile, use a bottom navigation bar.

For larger screens, use a left navigation rail/sidebar.

### Main routes

```text
/
/decks
/decks/[deckId]
/decks/[deckId]/cards
/decks/[deckId]/changes
/decks/[deckId]/stats
/cards
/cards/[cardId]
/wishlist
/settings
/settings/data
/settings/about
```

Because this is intended to be a single application rather than a public content site, routing should remain simple.

---

# 7. Core Data Model

## Deck

```ts
interface Deck {
  id: string;
  name: string;
  format: DeckFormat;
  description?: string;
  commanderId?: string;
  createdAt: string;
  updatedAt: string;
  activeVersionId?: string;
}
```

## Deck card

```ts
interface DeckCard {
  id: string;
  deckId: string;
  cardId: string;
  quantity: number;
  zone: "commander" | "mainboard" | "sideboard" | "maybeboard";
  status: "current" | "add" | "cut" | "consider";
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles: string[];
  synergies: string[];
  addedAt: string;
  updatedAt: string;
}
```

## Card

```ts
interface Card {
  id: string;
  oracleId: string;
  name: string;
  manaCost?: string;
  manaValue: number;
  typeLine: string;
  oracleText?: string;
  colors: string[];
  colorIdentity: string[];
  keywords: string[];
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  rarity?: string;
  imageSmall?: string;
  imageNormal?: string;
  imageLarge?: string;
  scryfallUri?: string;
  tcgplayerUri?: string;
  updatedAt: string;
}
```

## Price snapshot

```ts
interface CardPrice {
  cardId: string;
  currency: string;
  low?: number;
  market?: number;
  normal?: number;
  foil?: number;
  source: string;
  fetchedAt: string;
}
```

## Custom classification

```ts
interface Tag {
  id: string;
  name: string;
  category: "role" | "synergy" | "custom";
  color?: string;
}
```

## Deck version

```ts
interface DeckVersion {
  id: string;
  deckId: string;
  name: string;
  createdAt: string;
  snapshot: DeckSnapshot;
  notes?: string;
}
```

Versioning is highly recommended because deck-building is iterative.

---

# 8. Deck Status Model

Use the following states:

## CURRENT

Cards currently included in the active deck.

## ADD

Cards explicitly intended to be added in the next update.

## CUT

Cards currently in the deck that are targeted for removal.

## CONSIDER

Cards being evaluated but not yet committed.

This gives a useful workflow:

```text
CURRENT
   ↓
CUT ← CURRENT → KEEP
   ↓
ADD ← CONSIDER
   ↓
NEW CURRENT
```

Do not create separate independent databases for “current cards”, “cards to add”, and “cards to cut”.

Use a single deck-card model with statuses and generate filtered views from it.

---

# 9. Deck Lifecycle

A typical user workflow should be:

1. Create deck.
2. Choose format.
3. Add commander.
4. Import starting list or add cards manually.
5. Review deck composition.
6. Search for candidate cards.
7. Mark candidates as `CONSIDER`.
8. Promote candidates to `ADD`.
9. Mark existing cards as `CUT`.
10. View projected deck.
11. Review required purchases.
12. Review cost.
13. Apply changes.
14. Save a new deck version.

---

# 10. Deck Dashboard

Each deck gets a dedicated dashboard.

Top section:

- Deck name
- Format
- Commander image
- Current card count
- Projected card count
- Estimated current value
- Estimated upgrade cost
- Number of cards to add
- Number of cards to cut

Primary actions:

```text
Edit Deck
Add Card
Review Changes
View Stats
Save Version
Export
```

### Composition widgets

Display:

- Mana curve.
- Card type distribution.
- Color distribution.
- Mana source count.
- Creature count.
- Noncreature count.
- Land count.
- Role distribution.
- Synergy distribution.

---

# 11. Card List

The card list is the most important working surface.

Provide:

- Search.
- Sort.
- Filter.
- Group.
- Multi-select.
- Bulk status changes.
- Image toggle.
- Density toggle.

### Sorting

Sort by:

- Name.
- Mana value.
- Type.
- Color.
- Price.
- Quantity.
- Role.
- Synergy.
- Status.
- Set.
- Rarity.

### Filters

Filter by:

- Card type.
- Status.
- Role.
- Synergy.
- Mana value.
- Color identity.
- Set.
- Rarity.
- Owned.
- Foil.
- Price range.

---

# 12. Card Roles

Use multi-select roles instead of one single role.

Initial role catalog:

- Ramp
- Card Draw
- Card Selection
- Removal
- Board Wipe
- Protection
- Interaction
- Counterspell
- Anthem
- Token Generator
- Token Payoff
- Recursion
- Tutor
- Cost Reduction
- Mana Fixing
- Sacrifice Outlet
- Graveyard Hate
- Pillowfort
- Life Gain
- Voltron
- Win Condition
- Finisher
- Utility
- Combo Piece
- Other

Roles should be editable by the user.

Do not try to automatically classify every MTG card perfectly in the MVP. Allow automatic suggestions later, but always allow manual overrides.

---

# 13. Synergy Tags

Initial synergy tags can include:

- Soldier
- Human
- Warrior
- Knight
- Token
- Go-Wide
- +1/+1 Counter
- Equipment
- Artifact
- Enchantment
- ETB
- Death Trigger
- Sacrifice
- Graveyard
- Combat
- Aggro
- Control
- Midrange
- Tribal
- Protection
- Blink
- Reanimation
- Spells Matter

Allow custom tags.

For a Soldier Commander deck, for example:

```text
Card: Ballyrush Banneret
Type: Creature
Roles: Cost Reduction
Synergies: Soldier, Go-Wide
Status: CONSIDER
```

---

# 14. “Need to Add” Screen

This screen is central to the upgrade workflow.

Show all cards with:

```text
status = ADD
```

Columns/fields:

- Card image (optional).
- Card name.
- Quantity.
- Type.
- Role.
- Synergy.
- Lowest price.
- Market/reference price.
- Total cost.
- TCGplayer button.
- Owned status.

Summary bar:

```text
Cards to add: 8
Quantity: 8
Estimated cost: €37.42
Lowest total: €31.85
```

The price calculation must use a clearly defined price field and show the timestamp/source.

---

# 15. “Cards to Cut” Screen

Show all cards marked `CUT`.

Include:

- Card image.
- Name.
- Type.
- Role.
- Current price.
- Reason for cut.
- Replacement card if known.

Optional:

```text
CUT
  ↓
Replace with
  ↓
ADD
```

This creates an explicit upgrade relationship between a removed card and the card replacing it.

---

# 16. Projected Deck

Add a dedicated projection mode.

Instead of only showing the current deck, show:

```text
CURRENT
+ ADD
- CUT
= PROJECTED
```

For Commander, show:

- Current count.
- Projected count.
- Commander.
- Mainboard.
- Sideboard/maybeboard where relevant.

Show warnings when a proposed configuration violates the configured format rules.

---

# 17. Commander Validation

The MVP should support Commander properly enough to catch obvious errors.

Checks:

- Commander count.
- 100-card deck including commander where appropriate.
- Duplicate non-basic cards.
- Commander color identity.
- Missing/extra cards.
- Illegal cards if an appropriate legality source is available.

Do not attempt to hardcode every MTG format rule into the UI.

Create a format-rule service:

```ts
interface FormatRules {
  getDeckWarnings(deck: Deck): DeckWarning[];
}
```

This keeps future formats possible.

---

# 18. Deck Versions

Add version snapshots from the first production-ready release.

Example:

```text
Soldier Deck

v1 — Original
v2 — Added stronger ramp
v3 — Improved card draw
v4 — Post-playtest update
```

A version should store a full deck snapshot, not just a list of changes.

This allows:

- Restore previous version.
- Compare versions.
- See cards added/removed between versions.
- Keep a development history.

---

# 19. Multiple Decks

The application must support unlimited local decks subject only to practical storage constraints.

Deck list view:

```text
MY DECKS

[Soldier Swarm]
Mardu / Commander
100 cards
€182 estimated

[Artifacts]
Mono Blue / Commander
100 cards
€267 estimated
```

Actions:

- Create.
- Duplicate.
- Rename.
- Archive.
- Delete.
- Export.
- Import.
- Set favorite.
- Change commander.

### Duplicate deck

This is especially useful for experimenting with variants.

Example:

```text
Soldier Swarm
    ↓ duplicate
Soldier Swarm — Token Focus
Soldier Swarm — Equipment Focus
```

---

# 20. Wishlist

Create a global wishlist separate from individual decks.

A card can be on the wishlist even if it is not currently associated with a deck.

Fields:

- Card.
- Quantity.
- Priority.
- Price.
- Notes.
- Target deck.
- Target role.

Priority values:

- Essential.
- High.
- Medium.
- Low.

---

# 21. Card Search

Card search should be fast and mobile-friendly.

Support:

- Name search.
- Oracle text search where available.
- Type search.
- Color search.
- Mana value.
- Set.

Search UX:

```text
[ Search cards... ]

Suggested results

[image] Adeline, Resplendent Cathar
Creature — Human Knight
3 mana

[image] Arvad...
```

Tapping a result opens a card detail sheet.

Mobile UX should use a bottom sheet rather than forcing navigation for every card lookup.

---

# 22. Card Detail View

Card detail should include:

- Large card image.
- Name.
- Mana cost.
- Type line.
- Oracle text.
- Set.
- Rarity.
- Collector number.
- Price summary.
- TCGplayer link.
- Add to deck.
- Add to wishlist.
- Mark as Consider.
- Assign roles.
- Assign synergies.

Actions should be reachable without scrolling through excessive metadata.

---

# 23. Pricing Architecture

Do not hardcode TCGplayer assumptions into deck models.

Use a generic price record.

```text
Card
 ↓
Price Provider
 ↓
Price Snapshot
 ↓
Deck Valuation
```

Possible future providers:

- TCGplayer.
- Cardmarket.
- Scryfall reference prices.
- User-imported prices.

### Price fields

At minimum:

- Current price.
- Lowest price.
- Market/reference price.
- Foil price.
- Currency.
- Provider.
- Last updated.

### Price freshness

Every price should show:

```text
Updated 3h ago
```

Do not silently present an old cached number as live pricing.

### Price fallback behavior

If live pricing is unavailable:

```text
TCGplayer
Price unavailable
Last known: $X.XX
```

Never display `$0.00` because a price request failed.

---

# 24. TCGplayer Links

For each card, provide:

```text
[View on TCGplayer ↗]
```

Links should open externally.

Never make the app dependent on a TCGplayer page scraping operation in the browser.

Avoid browser-side scraping due to CORS, reliability, bot protection, and maintenance concerns.

If authenticated TCGplayer API access is available later, use a server-side integration rather than exposing credentials to the browser.

---

# 25. Card Images

Use Scryfall image URLs for card display, with appropriate caching behavior.

Do not download the complete MTG image database into IndexedDB.

Instead:

1. Persist metadata locally.
2. Persist image URLs locally.
3. Let the browser/service worker cache recently used images.
4. Optionally pre-cache images for the active deck.

### Deck image cache

Provide an action:

```text
Download deck images for offline use
```

This should cache only the user's active deck images rather than every card in the database.

---

# 26. Offline Mode

The application should support three levels of availability.

## Level 1 — Full online mode

- Search cards remotely.
- Refresh metadata.
- Refresh prices.
- Use all deck functionality.

## Level 2 — Offline with cached cards

- View existing decks.
- Edit decks.
- Search cached cards.
- View cached images.
- Update roles.
- Manage wishlist.
- Create versions.

Pricing should display the most recent cached value and timestamp.

## Level 3 — Offline without cache

- Existing local decks remain usable.
- New external card lookups are unavailable.
- Show an explicit offline state.

The user must never lose their local deck because a network request failed.

---

# 27. Service Worker Strategy

Use the service worker for application shell caching and selective asset caching.

Cache:

- App shell.
- Static JS/CSS.
- Icons.
- Fonts.
- Recently used card images.
- Selected local card metadata where appropriate.

Do not blindly cache every API request forever.

Use versioned caches:

```text
app-shell-v1
card-images-v1
api-cache-v1
```

On application deployment:

1. Create new cache version.
2. Activate service worker.
3. Remove old caches.
4. Notify UI if an update is available.
5. Provide “Reload to update”.

---

# 28. Local Database Schema

Recommended Dexie tables:

```text
cards
cardPrices
setMetadata
decks
deckCards
deckVersions
wishlists
wishlistItems
tags
settings
appMeta
```

Example:

```ts
class DeckBuilderDatabase extends Dexie {
  cards!: Table<Card, string>;
  cardPrices!: Table<CardPrice, string>;
  decks!: Table<Deck, string>;
  deckCards!: Table<DeckCard, string>;
  deckVersions!: Table<DeckVersion, string>;
  tags!: Table<Tag, string>;
  settings!: Table<AppSetting, string>;
}
```

Add DB schema migrations from the start.

Never rely on a database shape that cannot be migrated.

---

# 29. State Management Rules

Separate:

### Persistent state

- Decks.
- Cards.
- Prices.
- Wishlist.
- Tags.
- Settings.
- Versions.

### Remote state

- Scryfall requests.
- Price refresh requests.

### UI state

- Current filters.
- Open dialogs.
- Search query.
- Selected cards.
- Image display mode.
- Active tab.

Do not persist ephemeral UI state unless there is a clear UX reason.

---

# 30. Import / Export

This is a core feature, not a later nice-to-have.

## Full application export

Export:

```text
mtg-deck-builder-backup-2026-08-18.json
```

Include:

- Decks.
- Deck cards.
- Deck versions.
- Wishlist.
- Tags.
- Settings.
- Optional locally stored card metadata.

Do not include large remote card images in the JSON.

## Deck export

Allow:

- JSON.
- Human-readable text list.
- CSV.

### Import

Support at least:

- JSON backup.
- Text decklists.
- CSV.

Later:

- Moxfield import.
- Archidekt import.
- Commander Spellbook integrations where useful.

---

# 31. Data Safety UX

Because data is local-only in the MVP, make this obvious.

Settings → Data:

```text
LOCAL DATA

Your decks are stored on this device.

Last backup: Never

[ Export All Data ]
[ Import Backup ]
[ Clear All Data ]
```

Before clearing:

```text
This permanently removes all decks stored on this device.

Export a backup first.

[Cancel] [Export & Continue]
```

---

# 32. Mobile UX Requirements

The primary UX must be designed around a phone held in portrait mode.

Requirements:

- Bottom navigation.
- Large tap targets.
- Sticky action bars.
- Bottom sheets.
- Swipe-friendly card lists where useful.
- Avoid hover-only interactions.
- Avoid tiny table columns.
- Avoid requiring precision dragging.

### Desktop enhancement

On desktop:

- Use a wider dashboard.
- Use persistent side navigation.
- Show more metadata in tables.
- Allow multi-column layouts.

Desktop should enhance the app, not define it.

---

# 33. Mobile Card Row

Compact row design:

```text
┌──────────────────────────────────┐
│ Adeline, Resplendent Cathar      │
│ Creature — Human Knight          │
│ MV 3   Anthem · Token             │
│ ADD      €X.XX       TCGplayer ↗ │
└──────────────────────────────────┘
```

Image mode:

```text
┌──────────┬───────────────────────┐
│ CARD IMG │ Adeline               │
│          │ ADD                   │
│          │ Anthem / Token        │
│          │ €X.XX                 │
└──────────┴───────────────────────┘
```

Use the Neo Brutalism hard border/shadow treatment.

---

# 34. Dashboard Metrics

Minimum metrics:

### Deck size

```text
100 / 100
```

### Mana curve

Histogram of mana values.

### Card types

Creature / Artifact / Enchantment / Instant / Sorcery / Planeswalker / Land.

### Roles

Show distribution of role tags.

Example:

```text
Ramp             8
Card Draw       11
Removal          9
Protection       6
Anthem           4
Token Generator 12
```

### Upgrade cost

```text
ADD:  €42.18
CUT:  8 cards
NET:  €42.18
```

---

# 35. Deck Health / Warnings

A “Deck Check” panel should surface actionable issues.

Examples:

```text
✓ 100 cards
✓ Commander set
✓ No duplicate non-basics
⚠ 31 lands
⚠ 4 ramp sources
✓ 10 card-draw sources
✓ 8 removal sources
```

These checks should be configurable.

Do not label arbitrary recommendations as hard legality rules.

Use:

- `LEGALITY`
- `RECOMMENDATION`
- `WARNING`

as distinct categories.

---

# 36. Recommended Application Components

```text
components/
  app-shell/
  navigation/
  deck/
    deck-header
    deck-card-list
    deck-card-row
    deck-stats
    deck-warning-list
    deck-version-list
  cards/
    card-search
    card-result
    card-detail-sheet
    card-image
    card-price
  changes/
    change-list
    change-summary
    projected-deck
  wishlist/
  settings/
    data-management
    appearance
    preferences
  shared/
    empty-state
    loading-state
    offline-indicator
    confirm-dialog
```

Keep feature boundaries clean.

---

# 37. Suggested Project Structure

```text
app/
  layout.tsx
  page.tsx
  manifest.ts
  decks/
    page.tsx
    [deckId]/
      page.tsx
      cards/page.tsx
      changes/page.tsx
      stats/page.tsx
  cards/
    page.tsx
    [cardId]/page.tsx
  wishlist/
    page.tsx
  settings/
    page.tsx
    data/page.tsx
  api/
    cards/
    prices/

components/
lib/
  db/
  scryfall/
  pricing/
  deck-rules/
  import-export/
  pwa/
  format/
store/
types/
public/
  icons/
  sw.js
```

---

# 38. API Boundary

Even though the application is local-first, keep external integrations behind small API/service boundaries.

### Card service

```ts
searchCards(query);
getCard(cardId);
getCardsByIds(ids);
```

### Pricing service

```ts
getPrice(cardId);
getPrices(cardIds);
refreshPrice(cardId);
```

### Deck service

```ts
createDeck();
addCardToDeck();
removeCardFromDeck();
setCardStatus();
createVersion();
restoreVersion();
```

This prevents the UI from becoming tied to a specific implementation.

---

# 39. Error Handling

The app must distinguish:

- Offline.
- Card not found.
- Price unavailable.
- Image unavailable.
- Import invalid.
- Export failed.
- Local database migration failed.
- Storage quota exceeded.

Do not show generic “Something went wrong.” unless necessary.

Examples:

```text
Price unavailable
The card is still saved locally. Try refreshing prices later.
```

```text
You're offline
Your saved decks are still available. Card search may be limited to cached data.
```

---

# 40. Accessibility

Requirements:

- Keyboard accessible on desktop.
- Visible focus states.
- Sufficient text contrast.
- ARIA labels where needed.
- Screen-reader-friendly action names.
- No status communicated solely by color.
- Touch targets suitable for mobile.

Neo Brutalism's high contrast should help, but color-coded `ADD`, `CUT`, and `CONSIDER` statuses must also include text/icons.

---

# 41. Performance Targets

Target:

- Fast initial shell load.
- Instant local deck interaction.
- Virtualized long card lists where required.
- Lazy-loaded card images.
- No unnecessary re-fetch on every render.
- Debounced card search.
- Efficient IndexedDB queries.

### Important optimization

Do not render 100 large card images simultaneously unless the user selected Image mode.

For image mode:

- Lazy load images.
- Use appropriately sized Scryfall image URLs.
- Consider virtualized lists for large collections.

---

# 42. Testing Strategy

## Unit tests

Test:

- Deck calculations.
- Status filtering.
- Price totals.
- Projected deck calculations.
- Commander rules.
- Duplicate detection.
- Import/export parsing.
- DB migrations.

## Integration tests

Test:

- Adding a card.
- Marking card as ADD.
- Marking card as CUT.
- Applying changes.
- Creating version.
- Restoring version.
- Import/export.
- Offline operation.

## E2E tests

Use Playwright.

Test critical flows:

```text
Create deck
→ Add commander
→ Search card
→ Add card
→ Mark ADD
→ View upgrade cost
→ Export
→ Reload
→ Data still exists
```

### iPhone testing

Test on a real iPhone in Safari.

Do not rely solely on desktop Chrome responsive mode.

Test:

- Home Screen installation.
- Standalone launch.
- Local persistence.
- Offline operation.
- Service worker updates.
- Storage behavior.
- Safe-area insets.
- Keyboard behavior.
- External TCGplayer links.

---

# 43. Security

MVP does not require authentication.

If external price APIs require secrets:

- Never put secrets in client-side code.
- Use a Vercel server route/function as the integration boundary.
- Rate-limit expensive requests.
- Cache results.

If cloud sync is introduced later:

- Add authentication.
- Add authorization.
- Encrypt sensitive data at rest where appropriate.
- Validate imported files.
- Prevent arbitrary remote URL abuse.

---

# 44. Vercel Deployment

Use GitHub → Vercel.

Recommended flow:

```text
GitHub
  ↓
Vercel Preview
  ↓
QA
  ↓
main
  ↓
Production
```

Vercel provides Git-based deployments and preview deployments for commits/pull requests. urlVercel Deployment Overviewhttps://vercel.com/docs/deployments/overview

### Environment variables

Potential variables:

```text
NEXT_PUBLIC_APP_URL
PRICE_PROVIDER_API_KEY
PRICE_PROVIDER_ENDPOINT
```

Only variables that are genuinely public should use the `NEXT_PUBLIC_` prefix.

### Production commands

```bash
npm run build
npm run start
```

Deployment can also be done through Vercel CLI with:

```bash
vercel
vercel --prod
```

Vercel documents both Git-based deployments and CLI deployment. urlVercel CLI deployment documentationhttps://vercel.com/docs/cli/deploying-from-cli

---

# 45. Domain / HTTPS

Use HTTPS in production.

Example:

```text
https://mtg-deck-builder.example.com
```

A custom domain is optional for the MVP, but recommended before serious iPhone use.

HTTPS is required for the PWA/service-worker experience and is standard for Vercel production deployments.

---

# 46. Phase 0 — Product Definition

### Goal

Lock the product model before implementation.

### Tasks

1. Confirm name.
2. Confirm formats supported in MVP.
3. Confirm local-first/no-login strategy.
4. Define deck statuses.
5. Define initial roles.
6. Define initial synergy tags.
7. Define pricing provider strategy.
8. Define import/export formats.
9. Define card source policy.
10. Confirm Neo Brutalism theme.

### Deliverable

A small product specification with examples of:

- One Commander deck.
- Five cards marked ADD.
- Three cards marked CUT.
- Several CONSIDER cards.
- A wishlist.

---

# 47. Phase 1 — Repository & Foundation

### Goal

Create the application skeleton.

### Tasks

1. Create GitHub repository.
2. Initialize Next.js with TypeScript.
3. Install Tailwind CSS.
4. Install shadcn/ui.
5. Apply tweakcn Neo Brutalism theme.
6. Configure ESLint.
7. Configure Prettier.
8. Configure strict TypeScript.
9. Add Husky/lint-staged if desired.
10. Create initial CI workflow.
11. Deploy empty application to Vercel.

### Exit criteria

- App loads on Vercel.
- Theme is correct.
- GitHub → Vercel deploy works.
- Mobile layout exists.

---

# 48. Phase 2 — PWA Foundation

### Goal

Make the application installable and app-like on iPhone.

### Tasks

1. Create manifest.
2. Create app icons.
3. Configure standalone display.
4. Add theme/background colors.
5. Add iOS metadata.
6. Add Service Worker.
7. Add update strategy.
8. Add offline shell.
9. Add install instructions.
10. Test on a physical iPhone.

### Exit criteria

- App can be added to Home Screen.
- App opens as a standalone web app.
- App shell survives offline.
- App launches correctly from Home Screen.

---

# 49. Phase 3 — Local Database

### Goal

Build the local persistence layer before building complicated UI.

### Tasks

1. Install Dexie.
2. Create schema.
3. Add migrations.
4. Create repositories.
5. Build CRUD operations.
6. Add application settings.
7. Add local database initialization.
8. Add test database utilities.
9. Add export/import foundations.

### Exit criteria

The following works with the network disabled:

```text
Create deck
Rename deck
Add local card record
Update card status
Reload page
Data remains
```

---

# 50. Phase 4 — Scryfall Integration

### Goal

Make real MTG card search possible.

### Tasks

1. Implement Scryfall client.
2. Implement search.
3. Implement card lookup.
4. Normalize card data.
5. Cache card metadata locally.
6. Cache image URLs.
7. Implement request throttling.
8. Implement retry behavior.
9. Handle double-faced cards.
10. Handle alternate printings.

### Important

The application must distinguish:

- Card identity.
- Specific printing.

This matters for prices, sets, images, and TCGplayer links.

Recommended:

```text
oracleId → logical card identity
printingId → specific printing
```

---

# 51. Phase 5 — Deck Management

### Goal

Build the core deck-building workflow.

### Tasks

1. Create deck list.
2. Create deck.
3. Select format.
4. Add commander.
5. Add cards.
6. Remove cards.
7. Change quantity.
8. Mark status.
9. Add roles.
10. Add synergies.
11. Add notes.
12. Mark owned.
13. Mark foil.
14. Duplicate decks.
15. Archive/delete decks.

### Exit criteria

A complete Commander deck can be created and edited entirely from an iPhone.

---

# 52. Phase 6 — Deck Dashboard & Statistics

### Goal

Turn raw cards into actionable deck information.

### Tasks

1. Card count.
2. Mana curve.
3. Type distribution.
4. Color distribution.
5. Role distribution.
6. Synergy distribution.
7. Land count.
8. Status counts.
9. Estimated deck value.
10. Projected value.
11. Deck warnings.

### Exit criteria

The dashboard updates immediately after deck edits.

---

# 53. Phase 7 — Changes & Upgrade Workflow

### Goal

Implement the original core idea.

### Tasks

1. ADD state.
2. CUT state.
3. CONSIDER state.
4. Need-to-add screen.
5. Cards-to-cut screen.
6. Projected deck.
7. Upgrade cost.
8. Replacement relationships.
9. Apply changes.
10. Undo/review before apply.

### Exit criteria

A user can produce a full upgrade proposal without manually maintaining multiple lists.

---

# 54. Phase 8 — Pricing

### Goal

Show useful and transparent card prices.

### Tasks

1. Define pricing provider interface.
2. Implement available price source.
3. Store cached price snapshots.
4. Store fetch timestamps.
5. Display price provider.
6. Show low/reference price.
7. Calculate deck value.
8. Calculate upgrade cost.
9. Add TCGplayer outbound links.
10. Implement failure/fallback behavior.

### Exit criteria

The user can see:

```text
Need to Add

8 cards
Estimated price: €37.42
Prices updated: 18 Aug 2026
```

without misleading values when the source is unavailable.

---

# 55. Phase 9 — Images & Display Modes

### Goal

Make the card browser pleasant to use.

### Tasks

1. Card image component.
2. Compact mode.
3. Comfortable mode.
4. Image mode.
5. Lazy loading.
6. Offline image cache.
7. Active-deck image prefetch.
8. Global image toggle.
9. Persist preference.

### Exit criteria

The entire deck can be viewed quickly in compact mode and visually browsed in image mode.

---

# 56. Phase 10 — Import / Export & Recovery

### Goal

Make local-only storage safe enough for real use.

### Tasks

1. Full backup export.
2. Single-deck export.
3. Full backup import.
4. Single-deck import.
5. Text decklist import.
6. CSV export.
7. Backup metadata.
8. Validate backups.
9. Add migration version to backup.
10. Add destructive-action confirmation.

### Exit criteria

A complete collection of decks can be exported, deleted, and restored successfully.

---

# 57. Phase 11 — Versions & Comparison

### Goal

Make deck iteration safe and useful.

### Tasks

1. Snapshot deck.
2. Name version.
3. Save version.
4. Restore version.
5. Compare versions.
6. Show additions.
7. Show removals.
8. Show changed quantities.
9. Add version notes.

Example comparison:

```text
v3 → v4

+ 7 cards
- 7 cards

Added:
+ Skullclamp
+ Heroic Reinforcements

Removed:
- Card X
- Card Y
```

---

# 58. Phase 12 — Wishlist

### Goal

Create a persistent area for future upgrades.

### Tasks

1. Add card to wishlist.
2. Remove card.
3. Set priority.
4. Assign target deck.
5. Assign role.
6. Show price.
7. Move wishlist item to CONSIDER.
8. Move CONSIDER item to ADD.

---

# 59. Phase 13 — Format & Deck Validation

### Goal

Reduce common deck-building mistakes.

### Tasks

1. Commander count.
2. Card count.
3. Duplicate detection.
4. Color identity validation.
5. Basic legality rules.
6. Configurable recommendations.
7. Separate legality from recommendations.

Do not ship an enormous rules engine in the first iteration.

---

# 60. Phase 14 — UX Polish

### Goal

Make the app feel intentionally designed rather than merely functional.

### Tasks

1. Improve transitions.
2. Improve loading states.
3. Add skeletons.
4. Add offline indicator.
5. Add save confirmations where useful.
6. Add undo snackbars.
7. Tune mobile bottom sheets.
8. Tune iPhone safe areas.
9. Tune desktop layout.
10. Review all Neo Brutalism styles.

---

# 61. Phase 15 — Testing & Hardening

### Goal

Prevent data-loss bugs.

### Tasks

1. Unit tests.
2. Integration tests.
3. E2E tests.
4. iPhone testing.
5. Safari testing.
6. Offline testing.
7. Storage migration testing.
8. Import corruption tests.
9. Service Worker update tests.
10. Vercel preview testing.

Highest priority test:

```text
Create deck
→ Close app
→ Reopen from Home Screen
→ Deck remains intact
```

---

# 62. Phase 16 — Production Launch

### Checklist

- [ ] Production Vercel project created.
- [ ] HTTPS working.
- [ ] Custom domain configured if desired.
- [ ] PWA manifest verified.
- [ ] Icons verified.
- [ ] Service Worker verified.
- [ ] iPhone Home Screen installation tested.
- [ ] IndexedDB persistence tested.
- [ ] Data export tested.
- [ ] Data restore tested.
- [ ] Scryfall rate/request handling tested.
- [ ] Price provider behavior tested.
- [ ] TCGplayer links tested.
- [ ] No secrets exposed client-side.
- [ ] Production build succeeds.
- [ ] Error tracking configured.
- [ ] Analytics decision documented.

---

# 63. MVP Scope

The first production-capable release should contain:

### Core

- [x] Multiple decks.
- [x] Commander support.
- [x] Local-first storage.
- [x] IndexedDB.
- [x] PWA installation.
- [x] Offline deck editing.
- [x] Scryfall search.
- [x] Card metadata.
- [x] Card images.
- [x] CURRENT/ADD/CUT/CONSIDER states.
- [x] Roles.
- [x] Synergies.
- [x] Need-to-add list.
- [x] Cards-to-cut list.
- [x] Projected deck.
- [x] Upgrade cost.
- [x] TCGplayer links.
- [x] Price caching.
- [x] Import/export.
- [x] Deck duplication.
- [x] Deck versions.
- [x] Basic validation.
- [x] Neo Brutalism theme.
- [x] Vercel deployment.

### Explicitly not required for MVP

- User accounts.
- Cloud synchronization.
- Social sharing.
- Multiplayer collaboration.
- Public deck profiles.
- AI deck recommendations.
- Automated deck optimization.
- Full rules engine.
- Mobile App Store release.

---

# 64. Post-MVP Roadmap

## Version 1.1

- Better deck importers.
- More format rules.
- More advanced statistics.
- Better price provider coverage.
- Price history charts.
- Wishlist price alerts.
- Advanced search.
- Favorite cards.

## Version 1.2

- Cloud backup.
- Optional authentication.
- Cross-device sync.
- Shareable deck links.

## Version 2.0

- AI deck analysis.
- AI upgrade suggestions.
- Explain why a card should be added/cut.
- Synergy scoring.
- Curve optimization.
- Role coverage recommendations.
- Budget-aware upgrades.

Possible AI workflow:

```text
Current Deck
     ↓
Analyze cards
     ↓
Identify weaknesses
     ↓
Search card database
     ↓
Generate candidate upgrades
     ↓
Estimate cost
     ↓
User approves
     ↓
ADD / CUT proposal
```

AI should remain an optional analysis layer, not a core dependency.

---

# 65. Future Cloud Sync Architecture

If cloud synchronization is later required:

```text
                     ┌──────────────┐
                     │ Local IndexedDB│
                     └──────┬───────┘
                            │
                    Sync Engine
                            │
                     ┌──────▼───────┐
                     │ Cloud API    │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │ Postgres/DB   │
                     └───────────────┘
```

Local remains the source of truth for immediate UI interaction.

Use optimistic updates and a conflict-resolution strategy.

Do not bolt sync directly onto the UI after launch. Keep the repository layer prepared for it.

---

# 66. Recommended Backend Strategy

### MVP

No application backend database.

Use Vercel primarily for:

- Hosting Next.js.
- Server-side API routes where necessary.
- Secure price-provider integrations.
- Optional server-side card search proxy if required.

### Later

Introduce a backend only when one of these becomes necessary:

- Account authentication.
- Cloud sync.
- Shared decks.
- Public profiles.
- User-specific server-side preferences.
- Price aggregation that requires credentials.

This keeps the initial product dramatically simpler.

---

# 67. Data Ownership Principle

The user should always be able to get their decks back without depending on the service.

Therefore:

> Local data + portable export should be treated as a first-class product feature.

This is especially important because the application's core value is the user's accumulated deck-building work.

---

# 68. UX Details Worth Building Early

These seem small but will make the application much better:

### Undo

After a card is cut:

```text
Card removed
[UNDO]
```

### Bulk actions

Select multiple cards:

```text
5 selected

[Mark ADD]
[Mark CUT]
[Add Role]
[Remove]
```

### Quick-add

From card search:

```text
+ Add
```

Immediately inserts the card into the selected deck.

### Long press

On mobile, long-press a card row to reveal actions:

- Add.
- Cut.
- Consider.
- Details.
- Wishlist.

### Sticky upgrade summary

When editing changes:

```text
8 adds · 8 cuts · €37.42
[Review Changes]
```

---

# 69. Recommended MVP Screen Set

The MVP can be built with approximately these core screens:

```text
1. Home / Dashboard
2. Deck List
3. Deck Dashboard
4. Deck Cards
5. Card Search
6. Card Detail
7. Changes
8. Projected Deck
9. Versions
10. Wishlist
11. Settings
12. Data Management
```

Avoid creating 30+ screens for the first release.

Use bottom sheets, dialogs, and tabs for contextual operations.

---

# 70. Definition of Done

The application is ready for real personal use when the following workflow works flawlessly on an iPhone:

```text
Open app from Home Screen
        ↓
Select “Soldier Swarm”
        ↓
View current deck
        ↓
Toggle card images off
        ↓
Search “soldier”
        ↓
Open card
        ↓
See image + metadata + price
        ↓
Mark card CONSIDER
        ↓
Assign Soldier + Token tags
        ↓
Promote to ADD
        ↓
Mark an existing card CUT
        ↓
Open Need to Add
        ↓
See total upgrade price
        ↓
Open TCGplayer link
        ↓
Apply changes
        ↓
Save version
        ↓
Close app
        ↓
Reopen from Home Screen
        ↓
Everything remains
```

If that flow is reliable, the product has achieved its primary purpose.

---

# 71. Final Recommended Build Order

The most efficient implementation sequence is:

```text
1. Next.js + TypeScript
2. Neo Brutalism theme
3. Vercel deployment
4. PWA manifest + iPhone shell
5. IndexedDB/Dexie
6. Deck CRUD
7. Scryfall card search
8. Deck card management
9. CURRENT / ADD / CUT / CONSIDER
10. Roles + Synergies
11. Deck statistics
12. Upgrade calculations
13. TCGplayer links
14. Pricing provider + cache
15. Card image modes
16. Offline caching
17. Import/export
18. Deck versions
19. Wishlist
20. Validation
21. Testing
22. Production hardening
```

This order intentionally gets **local persistence and the core deck workflow working before advanced pricing and polish**.

---

# 72. Architectural Principle Summary

The final architecture should remain simple:

```text
                 ┌─────────────────────┐
                 │      Next.js UI     │
                 │ React + shadcn/ui   │
                 └──────────┬──────────┘
                            │
                  Application Services
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       Local Data       Card Data        Pricing
            │               │               │
         Dexie           Scryfall       Provider API
            │               │               │
        IndexedDB        Network         Network
            │
       Offline First
```

The service worker improves the shell/offline experience, but **IndexedDB remains the source of truth for the user's decks**.

Vercel hosts the Next.js application and any small server-side integration endpoints that are required. Vercel's current Next.js support is first-class and does not require a custom hosting architecture. urlVercel — Next.js on Vercelhttps://vercel.com/docs/frameworks/full-stack/nextjs

---

# 73. Key Decisions to Preserve During Implementation

1. **Local-first is the default.** Do not accidentally introduce a backend dependency for deck data.
2. **IndexedDB/Dexie is the persistence layer.** Do not use localStorage as the primary deck database.
3. **The app must be designed for iPhone first.** Desktop is an enhancement.
4. **Use the Neo Brutalism theme directly.** Do not replace it with a generic rounded UI.
5. **Use one deck-card model with statuses.** Do not create separate data structures for adds and cuts.
6. **Roles and synergies are multi-valued.** A card can have many tags.
7. **Pricing is provider-agnostic.** TCGplayer links are important, but the application should not break if a TCGplayer API integration is unavailable.
8. **Backups are mandatory.** Local-only data without export is not sufficient.
9. **Version snapshots are valuable.** Deck experimentation should never destroy previous configurations.
10. **The web app should be useful offline.** Losing network connectivity must not prevent editing existing decks.

---

# 74. References

- [Neo Brutalism theme JSON](https://tweakcn.com/r/themes/neo-brutalism.json)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Vercel — Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel — Deployment Overview](https://vercel.com/docs/deployments/overview)
- [Vercel CLI Deployment](https://vercel.com/docs/cli/deploying-from-cli)
- [WebKit — Web Apps on iOS/iPadOS](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [WebKit — Home Screen Web Apps / Storage Behavior](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [Scryfall Cards API](https://scryfall.com/docs/api/cards)

---

# 75. Recommended First Milestone

The first implementation milestone should deliberately be small:

> **Create and persist multiple decks locally, install the app to an iPhone Home Screen, search Scryfall, add cards, mark cards ADD/CUT/CONSIDER, and reopen the app with all data intact.**

Do this before building sophisticated pricing or AI functionality.

Once that works, the rest of the product can be layered on safely.
