/**
 * Pure mana-cost tokenizer — splits Scryfall mana strings into ordered tokens.
 */

export type ManaCostToken = {
  /** Full brace form, e.g. `{W}` or `{W/U}`. */
  raw: string;
  /** True when the input could not be parsed as brace tokens. */
  unknown?: boolean;
};

const TOKEN_RE = /\{[^}]+\}/g;

/**
 * Split a Scryfall mana cost into ordered tokens.
 * Unknown / non-brace input yields a single unknown token (or empty).
 */
export function parseManaCost(
  cost: string | null | undefined,
): ManaCostToken[] {
  if (cost == null) return [];
  const trimmed = cost.trim();
  if (!trimmed) return [];

  const matches = trimmed.match(TOKEN_RE);
  if (!matches) {
    return [{ raw: trimmed, unknown: true }];
  }

  // If there is non-brace junk mixed in, treat whole string as unknown.
  const reconstructed = matches.join("");
  if (reconstructed !== trimmed.replace(/\s+/g, "")) {
    // Allow whitespace between tokens
    const withoutSpace = trimmed.replace(/\s+/g, "");
    if (matches.join("") !== withoutSpace) {
      return [{ raw: trimmed, unknown: true }];
    }
  }

  return matches.map((raw) => ({ raw }));
}

/** Human-readable label for a token (used in aria-label). */
export function describeManaToken(raw: string): string {
  const inner = raw.replace(/^\{|\}$/g, "");
  if (!inner) return "unknown";

  const phyrexian = /^([WUBRGC])\/P$/i.exec(inner);
  if (phyrexian) {
    return `one ${colorWord(phyrexian[1]!)} Phyrexian mana`;
  }

  const hybrid = /^([WUBRGC])\/([WUBRGC])$/i.exec(inner);
  if (hybrid) {
    return `${colorWord(hybrid[1]!)} or ${colorWord(hybrid[2]!)}`;
  }

  const twoHybrid = /^2\/([WUBRGC])$/i.exec(inner);
  if (twoHybrid) {
    return `two generic or ${colorWord(twoHybrid[1]!)}`;
  }

  if (/^\d+$/.test(inner)) {
    const n = Number(inner);
    return n === 1 ? "one generic" : `${n} generic`;
  }

  switch (inner.toUpperCase()) {
    case "W":
      return "white";
    case "U":
      return "blue";
    case "B":
      return "black";
    case "R":
      return "red";
    case "G":
      return "green";
    case "C":
      return "colorless";
    case "S":
      return "snow";
    case "X":
      return "X";
    case "Y":
      return "Y";
    case "Z":
      return "Z";
    case "T":
      return "tap";
    case "Q":
      return "untap";
    case "E":
      return "energy";
    case "P":
      return "Phyrexian";
    case "H":
      return "half";
    case "∞":
    case "INFINITY":
      return "infinity";
    default:
      return inner;
  }
}

function colorWord(letter: string): string {
  switch (letter.toUpperCase()) {
    case "W":
      return "white";
    case "U":
      return "blue";
    case "B":
      return "black";
    case "R":
      return "red";
    case "G":
      return "green";
    case "C":
      return "colorless";
    default:
      return letter;
  }
}

export function describeManaCost(cost: string | null | undefined): string {
  const tokens = parseManaCost(cost);
  if (tokens.length === 0) return "no mana cost";
  return tokens.map((t) => describeManaToken(t.raw)).join(", ");
}
