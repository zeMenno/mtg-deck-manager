/** Generate a UUID for persisted entities (not Scryfall / tag slug ids). */
export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
