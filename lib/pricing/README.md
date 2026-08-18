# Pricing layer

## Chosen price field

Scryfall reference prices are mapped as follows (MVP):

| Snapshot field | Scryfall source                         |
| -------------- | --------------------------------------- |
| `normal`       | `prices.usd` / `prices.eur`             |
| `foil`         | `prices.usd_foil` / `prices.eur_foil`   |
| `low`          | Same as `normal` (no TCGplayer low API) |
| `market`       | Same as `normal`                        |

UI labels the source as **Scryfall**. TCGplayer is outbound purchase links only (`Card.tcgplayerUri`), never scraped.

## Semantics

- `undefined` / `null` → **Price unavailable** (never `$0.00`)
- Numeric `0` → legitimate free/near-free listing (`$0.00` OK)
- Stale after `priceFreshnessHours` (default 24h)
- Offline uses Dexie cache with "Offline · cached price" labeling
