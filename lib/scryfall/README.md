# Scryfall Integration

Local-first card metadata pipeline: **Scryfall → normalize → Dexie `cards` → TanStack Query**.

## oracleId vs printingId

| Field           | Scryfall source | Meaning                                     |
| --------------- | --------------- | ------------------------------------------- |
| `Card.id`       | `id`            | Specific **printing** (art/set/collector #) |
| `Card.oracleId` | `oracle_id`     | Logical card identity across all printings  |

**Rules for later phases:**

- Store `DeckCard.cardId = Card.id` (printing the user picked).
- Use `Card.oracleId` for duplicate detection, color identity grouping, and legality.
- Never call `https://api.scryfall.com` from React components — always use `lib/scryfall/`.

## Rate limits

- Minimum **75ms** between request starts (`rate-limiter.ts`).
- HTTP **429** → honor `Retry-After` or exponential backoff (max 3 retries).
- HTTP **5xx** → exponential backoff (max 3 retries).

## Search defaults

- `unique=cards` — one result per oracle (less clutter on mobile).
- Pass `unique: "prints"` when the UI needs every printing.

## Optional proxy

Set `NEXT_PUBLIC_USE_SCRYFALL_PROXY=true` to route client requests through `/api/cards/*` (User-Agent on the server). Direct browser CORS to Scryfall is the default MVP path.

## Offline

Successful searches upsert into Dexie. When `navigator.onLine === false`, hooks fall back to `CardRepository.searchLocal()`.
