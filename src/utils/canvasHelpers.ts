/*
    QRCraftly
    Copyright (C) 2025 fderuiter

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


/**
 * Traces a rounded rectangle path.
 * @param ctx The canvas context.
 * @param x The top-left x coordinate.
 * @param y The top-left y coordinate.
 * @param w The width of the rectangle.
 * @param h The height of the rectangle.
 * @param r The corner radius.
 */
export const traceRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  // @ts-ignore - roundRect is part of newer Canvas API
  if (ctx.roundRect) {
    // @ts-ignore
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
};

/**
 * Traces a regular polygon path.
 * @param ctx The canvas context.
 * @param x The center x coordinate.
 * @param y The center y coordinate.
 * @param r The radius.
 * @param sides The number of sides.
 * @param rotate Rotation angle in radians (default: 0).
 */
export const tracePoly = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotate: number = 0) => {
  for (let i = 0; i < sides; i++) {
    const theta = rotate + (i * 2 * Math.PI / sides);
    const px = x + r * Math.cos(theta);
    const py = y + r * Math.sin(theta);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

/**
 * Traces a star shape path.
 * @param ctx The canvas context.
 * @param cx The center x coordinate.
 * @param cy The center y coordinate.
 * @param outerR The outer radius.
 * @param innerR The inner radius.
 * @param spikes The number of spikes.
 */
export const traceStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, spikes: number) => {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
};

/**
 * Traces a roughly rectangular shape (slightly rotated) path.
 * @param ctx The canvas context.
 * @param x The top-left x coordinate.
 * @param y The top-left y coordinate.
 * @param w The width.
 * @param h The height.
 */
export const traceRoughRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.save();
  // Just a slight rotation for style
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(0.02);
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.restore();
};

/**
 * Traces a scribbled shape path.
 * @param ctx The canvas context.
 * @param x The top-left x coordinate.
 * @param y The top-left y coordinate.
 * @param s The size of the bounding box.
 */
export const traceScribble = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.rotate(0.1);
  // Draw a rough polygon that fills most of the space
  const r = s / 1.8; // Radius to cover square corners
  for (let i = 0; i < 8; i++) {
    const angle = i * (Math.PI * 2) / 8;
    const dist = r * (0.8 + Math.random() * 0.4);
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.restore();
};
