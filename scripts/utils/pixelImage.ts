/*
    QRCraftly
    Copyright (C) 2026 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import zlib from 'node:zlib';

/**
 * A tiny indexed-colour raster, a pixel font and a PNG encoder, so the build can write share
 * images in plain Node with no image library and no system fonts (#1030).
 */

/** An opaque colour as red, green and blue bytes. */
export type Rgb = readonly [red: number, green: number, blue: number];

export interface PixelCanvas {
  width: number;
  height: number;
  /** One palette index per pixel, row by row. */
  pixels: Uint8Array;
  /** The colours the pixels index. */
  palette: Rgb[];
}

/**
 * Creates a canvas filled with the first palette colour.
 * @param width - Width in pixels.
 * @param height - Height in pixels.
 * @param palette - Colours (at most 256); pixels are palette indexes.
 * @returns The canvas.
 */
export function createCanvas(width: number, height: number, palette: Rgb[]): PixelCanvas {
  return { width, height, pixels: new Uint8Array(width * height), palette };
}

/**
 * Fills a rectangle, clipped to the canvas.
 * @param canvas - The canvas.
 * @param x - Left edge.
 * @param y - Top edge.
 * @param w - Width.
 * @param h - Height.
 * @param colour - Palette index.
 */
export function fillRect(canvas: PixelCanvas, x: number, y: number, w: number, h: number, colour: number): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.width, Math.floor(x + w));
  const y1 = Math.min(canvas.height, Math.floor(y + h));
  for (let row = y0; row < y1; row++) {
    canvas.pixels.fill(colour, row * canvas.width + x0, row * canvas.width + x1);
  }
}

// 5 x 7 glyphs, one string per row ('#' is ink). Letters are drawn in capitals.
const GLYPHS: Record<string, readonly string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Glyph columns and rows, and the gap between letters, in font pixels. */
const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_GAP = 1;

/**
 * Width in canvas pixels of a line of text at a scale.
 * @param text - The text.
 * @param scale - Canvas pixels per font pixel.
 * @returns The width.
 */
export function textWidth(text: string, scale: number): number {
  return text.length === 0 ? 0 : (text.length * (GLYPH_W + GLYPH_GAP) - GLYPH_GAP) * scale;
}

/**
 * Height in canvas pixels of one line of text at a scale.
 * @param scale - Canvas pixels per font pixel.
 * @returns The height.
 */
export function lineHeight(scale: number): number {
  return GLYPH_H * scale;
}

/**
 * Keeps only characters the font can draw, in capitals, with runs of spaces collapsed.
 * @param text - The text.
 * @returns Text made of drawable characters.
 */
export function drawable(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9\-.,&/:'!? ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into lines no wider than a limit, breaking at spaces.
 * @param text - Drawable text.
 * @param scale - Canvas pixels per font pixel.
 * @param maxWidth - The widest a line may be, in canvas pixels.
 * @returns The lines. A single word wider than the limit stays on its own line.
 */
export function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, scale) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws one line of text.
 * @param canvas - The canvas.
 * @param text - Drawable text (see {@link drawable}).
 * @param x - Left edge.
 * @param y - Top edge.
 * @param scale - Canvas pixels per font pixel.
 * @param colour - Palette index.
 */
export function drawText(canvas: PixelCanvas, text: string, x: number, y: number, scale: number, colour: number): void {
  let cursor = x;
  for (const char of text) {
    const glyph = GLYPHS[char] ?? GLYPHS['?'];
    glyph.forEach((row, rowIndex) => {
      for (let col = 0; col < GLYPH_W; col++) {
        if (row[col] === '#') fillRect(canvas, cursor + col * scale, y + rowIndex * scale, scale, scale, colour);
      }
    });
    cursor += (GLYPH_W + GLYPH_GAP) * scale;
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/**
 * Encodes a canvas as an indexed-colour PNG.
 * @param canvas - The canvas.
 * @returns The PNG file bytes.
 */
export function encodePng(canvas: PixelCanvas): Buffer {
  const { width, height, pixels, palette } = canvas;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 3; // indexed colour
  const raw = Buffer.alloc((width + 1) * height);
  for (let row = 0; row < height; row++) {
    raw[row * (width + 1)] = 0; // filter: none
    raw.set(pixels.subarray(row * width, (row + 1) * width), row * (width + 1) + 1);
  }
  const plte = Buffer.from(palette.flatMap(([r, g, b]) => [r, g, b]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', plte),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/**
 * Encodes an RGBA image as a truecolour PNG (alpha ignored: the image is opaque).
 * @param width - Width in pixels.
 * @param height - Height in pixels.
 * @param rgba - Pixels, four bytes each, row by row.
 * @returns The PNG file bytes.
 */
export function encodeRgbPng(width: number, height: number, rgba: Uint8Array | Uint8ClampedArray): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let row = 0; row < height; row++) {
    const base = row * (width * 3 + 1);
    raw[base] = 0; // filter: none
    for (let col = 0; col < width; col++) {
      const from = (row * width + col) * 4;
      raw[base + 1 + col * 3] = rgba[from];
      raw[base + 2 + col * 3] = rgba[from + 1];
      raw[base + 3 + col * 3] = rgba[from + 2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}
