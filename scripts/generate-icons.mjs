/**
 * Generates the PWA icon set in public/icons/ from vector primitives.
 *
 * The artwork is intentionally nothing but axis-aligned rectangles in the three
 * Neo Brutalism theme colours, so it renders identically on every machine (no
 * font or gradient dependencies) and survives being scaled down to a 60px iOS
 * Home Screen tile.
 *
 * Run with: npm run icons:generate
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

// sRGB equivalents of the app's oklch theme tokens in app/globals.css:
// --primary, --secondary, --foreground/--border, --background.
const RED = "#ff3333";
const YELLOW = "#ffff00";
const BLACK = "#000000";
const WHITE = "#ffffff";

const CANVAS = 512;
const OUTPUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);

function rect({ x, y, width, height, fill }) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

/** A card: hard black border drawn as an outer rect, fill inset by `border`. */
function card({ x, y, width, height, fill, border }) {
  return [
    rect({ x, y, width, height, fill: BLACK }),
    rect({
      x: x + border,
      y: y + border,
      width: width - border * 2,
      height: height - border * 2,
      fill,
    }),
  ].join("");
}

/**
 * Three offset cards — the "stack of decks" mark.
 * `scale` shrinks the mark toward the canvas centre for maskable icons, whose
 * outer 20% may be cropped away by the platform mask.
 */
function deckMark(scale) {
  const cardWidth = 210;
  const cardHeight = 280;
  const step = 32;
  const border = 14;

  // Bounding box of the three offset cards, centred on the canvas.
  const markWidth = cardWidth + step * 2;
  const markHeight = cardHeight + step * 2;
  const originX = (CANVAS - markWidth * scale) / 2;
  const originY = (CANVAS - markHeight * scale) / 2;

  const layers = [YELLOW, WHITE, WHITE];

  return layers
    .map((fill, index) =>
      card({
        x: originX + index * step * scale,
        y: originY + index * step * scale,
        width: cardWidth * scale,
        height: cardHeight * scale,
        fill,
        border: border * scale,
      }),
    )
    .concat(
      // Title bar on the front card, so the mark still reads as a card at 60px.
      rect({
        x: originX + (2 * step + border + 18) * scale,
        y: originY + (2 * step + border + 18) * scale,
        width: (cardWidth - border * 2 - 36) * scale,
        height: 40 * scale,
        fill: BLACK,
      }),
    )
    .join("");
}

function svg({ size, maskable }) {
  const frame = maskable
    ? rect({ x: 0, y: 0, width: CANVAS, height: CANVAS, fill: RED })
    : [
        rect({ x: 0, y: 0, width: CANVAS, height: CANVAS, fill: BLACK }),
        rect({ x: 32, y: 32, width: 448, height: 448, fill: RED }),
      ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${CANVAS} ${CANVAS}">${frame}${deckMark(maskable ? 0.72 : 1)}</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-512-maskable.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const target of targets) {
  const png = await sharp(Buffer.from(svg(target)))
    // Opaque background: iOS refuses transparency on Home Screen icons.
    .flatten({ background: BLACK })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(join(OUTPUT_DIR, target.file), png);
  process.stdout.write(`${target.file} ${target.size}x${target.size}\n`);
}
