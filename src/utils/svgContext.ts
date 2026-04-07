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
 * A 2D affine transformation matrix in column-major form:
 *   | a  c  e |
 *   | b  d  f |
 *   | 0  0  1 |
 */
interface Matrix {
  a: number; b: number;
  c: number; d: number;
  e: number; f: number;
}

function identityMatrix(): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

interface ContextState {
  transform: Matrix;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  dashArray: number[];
}

/**
 * A virtual 2D drawing context that captures canvas draw calls and produces
 * equivalent SVG XML. It implements the subset of CanvasRenderingContext2D
 * methods actually used by the QR rendering pipeline.
 *
 * Usage:
 *   const ctx = new SvgContext(1024, 1024);
 *   drawQRInternal(ctx as unknown as CanvasRenderingContext2D, ...);
 *   const svgString = ctx.serialize();
 */
export class SvgContext {
  // Public style properties (mirrors CanvasRenderingContext2D)
  fillStyle: string = '#000000';
  strokeStyle: string = '#000000';
  lineWidth: number = 1;
  font: string = '10px sans-serif';
  textAlign: string = 'start';
  textBaseline: string = 'alphabetic';

  // Mock canvas property for compatibility with drawQR signature
  readonly canvas: { width: number; height: number };

  private readonly _width: number;
  private readonly _height: number;
  private _elements: string[] = [];
  private _pathData: string = '';
  private _transform: Matrix = identityMatrix();
  private _stateStack: ContextState[] = [];
  private _dashArray: number[] = [];

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this.canvas = { width, height };
  }

  // ── Transform helpers ──────────────────────────────────────────────────────

  private _applyTransform(x: number, y: number): [number, number] {
    const m = this._transform;
    return [
      m.a * x + m.c * y + m.e,
      m.b * x + m.d * y + m.f,
    ];
  }

  /** Returns a formatted number with up to 3 decimal places, no trailing zeros. */
  private _n(v: number): string {
    return parseFloat(v.toFixed(3)).toString();
  }

  // ── State management ───────────────────────────────────────────────────────

  save(): void {
    this._stateStack.push({
      transform: { ...this._transform },
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      dashArray: [...this._dashArray],
    });
  }

  restore(): void {
    const state = this._stateStack.pop();
    if (state) {
      this._transform = state.transform;
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
      this._dashArray = state.dashArray;
    }
  }

  scale(sx: number, sy: number): void {
    this._transform = multiplyMatrix(this._transform, {
      a: sx, b: 0, c: 0, d: sy, e: 0, f: 0,
    });
  }

  translate(tx: number, ty: number): void {
    this._transform = multiplyMatrix(this._transform, {
      a: 1, b: 0, c: 0, d: 1, e: tx, f: ty,
    });
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this._transform = multiplyMatrix(this._transform, {
      a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0,
    });
  }

  // ── Path API ───────────────────────────────────────────────────────────────

  beginPath(): void {
    this._pathData = '';
  }

  closePath(): void {
    this._pathData += 'Z ';
  }

  moveTo(x: number, y: number): void {
    const [tx, ty] = this._applyTransform(x, y);
    this._pathData += `M ${this._n(tx)} ${this._n(ty)} `;
  }

  lineTo(x: number, y: number): void {
    const [tx, ty] = this._applyTransform(x, y);
    this._pathData += `L ${this._n(tx)} ${this._n(ty)} `;
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    const [tcpx, tcpy] = this._applyTransform(cpx, cpy);
    const [tx, ty] = this._applyTransform(x, y);
    this._pathData += `Q ${this._n(tcpx)} ${this._n(tcpy)} ${this._n(tx)} ${this._n(ty)} `;
  }

  /**
   * Adds a rectangular sub-path to the current path (with transform applied).
   * The four corners are transformed individually so rotated rects are handled correctly.
   */
  rect(x: number, y: number, w: number, h: number): void {
    const [x0, y0] = this._applyTransform(x, y);
    const [x1, y1] = this._applyTransform(x + w, y);
    const [x2, y2] = this._applyTransform(x + w, y + h);
    const [x3, y3] = this._applyTransform(x, y + h);
    this._pathData += `M ${this._n(x0)} ${this._n(y0)} `;
    this._pathData += `L ${this._n(x1)} ${this._n(y1)} `;
    this._pathData += `L ${this._n(x2)} ${this._n(y2)} `;
    this._pathData += `L ${this._n(x3)} ${this._n(y3)} Z `;
  }

  /**
   * Adds a rounded rectangle sub-path using quadratic Bézier curves.
   * Applies the current transform to all corner and control points.
   * Note: The `radii` parameter is treated as a uniform radius (single number).
   */
  roundRect(x: number, y: number, w: number, h: number, r: number): void {
    // Clamp radius so it doesn't exceed half the shorter side
    const safeR = Math.min(r, w / 2, h / 2);

    const pt = (px: number, py: number) => {
      const [tx, ty] = this._applyTransform(px, py);
      return `${this._n(tx)} ${this._n(ty)}`;
    };

    this._pathData += `M ${pt(x + safeR, y)} `;
    this._pathData += `L ${pt(x + w - safeR, y)} `;
    this._pathData += `Q ${pt(x + w, y)} ${pt(x + w, y + safeR)} `;
    this._pathData += `L ${pt(x + w, y + h - safeR)} `;
    this._pathData += `Q ${pt(x + w, y + h)} ${pt(x + w - safeR, y + h)} `;
    this._pathData += `L ${pt(x + safeR, y + h)} `;
    this._pathData += `Q ${pt(x, y + h)} ${pt(x, y + h - safeR)} `;
    this._pathData += `L ${pt(x, y + safeR)} `;
    this._pathData += `Q ${pt(x, y)} ${pt(x + safeR, y)} Z `;
  }

  /**
   * Adds an arc/circle sub-path to the current path.
   * Handles the common cases: full circles and partial arcs.
   * Assumes the current transform contains only translation and uniform scaling
   * (no shear), so the arc remains circular after transformation.
   */
  arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, anticlockwise: boolean = false): void {
    // Determine the scale factor from the transform (uniform scale assumed)
    const m = this._transform;
    const scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
    const scaledR = r * scaleX;

    const [tcx, tcy] = this._applyTransform(cx, cy);

    // Normalise angles to be increasing
    let sa = startAngle;
    let ea = endAngle;
    if (anticlockwise) {
      [sa, ea] = [ea, sa];
    }

    const TWO_PI = Math.PI * 2;
    const delta = ((ea - sa) % TWO_PI + TWO_PI) % TWO_PI;

    if (delta === 0 || Math.abs(delta - TWO_PI) < 1e-10) {
      // Full circle: draw as two half-arcs (SVG can't do a full circle in one A command)
      const sx = tcx + scaledR;
      const sy = tcy;
      const mx = tcx - scaledR;
      const my = tcy;
      this._pathData += `M ${this._n(sx)} ${this._n(sy)} `;
      this._pathData += `A ${this._n(scaledR)} ${this._n(scaledR)} 0 1 1 ${this._n(mx)} ${this._n(my)} `;
      this._pathData += `A ${this._n(scaledR)} ${this._n(scaledR)} 0 1 1 ${this._n(sx)} ${this._n(sy)} Z `;
      return;
    }

    // Partial arc
    const startX = tcx + scaledR * Math.cos(sa);
    const startY = tcy + scaledR * Math.sin(sa);
    const endX = tcx + scaledR * Math.cos(ea);
    const endY = tcy + scaledR * Math.sin(ea);
    const largeArcFlag = delta > Math.PI ? 1 : 0;
    const sweepFlag = anticlockwise ? 0 : 1;

    this._pathData += `M ${this._n(startX)} ${this._n(startY)} `;
    this._pathData += `A ${this._n(scaledR)} ${this._n(scaledR)} 0 ${largeArcFlag} ${sweepFlag} ${this._n(endX)} ${this._n(endY)} `;
  }

  // ── Immediate draw calls ───────────────────────────────────────────────────

  fill(): void {
    if (!this._pathData.trim()) return;
    const fill = this._cssColor(this.fillStyle);
    this._elements.push(`<path d="${this._pathData.trim()}" fill="${fill}" fill-rule="evenodd"/>`);
    this._pathData = '';
  }

  stroke(): void {
    if (!this._pathData.trim()) return;
    const stroke = this._cssColor(this.strokeStyle);
    const dash = this._dashArray.length > 0
      ? ` stroke-dasharray="${this._dashArray.join(' ')}"`
      : '';
    this._elements.push(
      `<path d="${this._pathData.trim()}" fill="none" stroke="${stroke}" stroke-width="${this._n(this.lineWidth)}"${dash}/>`
    );
    this._pathData = '';
  }

  /** Fills a rectangle directly (without modifying the current path). */
  fillRect(x: number, y: number, w: number, h: number): void {
    const fill = this._cssColor(this.fillStyle);
    const [x0, y0] = this._applyTransform(x, y);
    const [x1, y1] = this._applyTransform(x + w, y);
    const [x2, y2] = this._applyTransform(x + w, y + h);
    const [x3, y3] = this._applyTransform(x, y + h);
    const d = `M ${this._n(x0)} ${this._n(y0)} L ${this._n(x1)} ${this._n(y1)} L ${this._n(x2)} ${this._n(y2)} L ${this._n(x3)} ${this._n(y3)} Z`;
    this._elements.push(`<path d="${d}" fill="${fill}"/>`);
  }

  /**
   * Strokes a rectangle directly.
   * Supports the dashed/dotted border styles used in the QR border renderer.
   */
  strokeRect(x: number, y: number, w: number, h: number): void {
    const stroke = this._cssColor(this.strokeStyle);
    const dash = this._dashArray.length > 0
      ? ` stroke-dasharray="${this._dashArray.join(' ')}"`
      : '';
    const [x0, y0] = this._applyTransform(x, y);
    const [x1, y1] = this._applyTransform(x + w, y);
    const [x2, y2] = this._applyTransform(x + w, y + h);
    const [x3, y3] = this._applyTransform(x, y + h);
    const d = `M ${this._n(x0)} ${this._n(y0)} L ${this._n(x1)} ${this._n(y1)} L ${this._n(x2)} ${this._n(y2)} L ${this._n(x3)} ${this._n(y3)} Z`;
    this._elements.push(
      `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${this._n(this.lineWidth)}"${dash}/>`
    );
  }

  /**
   * No-op: In the QR renderer, clearRect is always followed by a fillRect with
   * the background colour, so the area will be properly painted over.
   */
  clearRect(_x: number, _y: number, _w: number, _h: number): void {
    // Intentional no-op for SVG export (see comment above)
  }

  /** Renders text as an SVG <text> element. */
  fillText(text: string, x: number, y: number): void {
    const fill = this._cssColor(this.fillStyle);
    const [tx, ty] = this._applyTransform(x, y);
    const anchor = this._svgTextAnchor(this.textAlign);
    const baseline = this._svgDominantBaseline(this.textBaseline);
    this._elements.push(
      `<text x="${this._n(tx)}" y="${this._n(ty)}" fill="${fill}" font="${this._escapeAttr(this.font)}" text-anchor="${anchor}" dominant-baseline="${baseline}">${this._escapeText(text)}</text>`
    );
  }

  /**
   * Draws an image into the SVG as a base64-encoded <image> element.
   * Accepts HTMLImageElement (uses .src) or a data URL string.
   */
  drawImage(image: HTMLImageElement | { src: string }, dx: number, dy: number, dw: number, dh: number): void {
    const href = (image as HTMLImageElement).src ?? '';
    if (!href) return;
    const [tx, ty] = this._applyTransform(dx, dy);
    // Approximate scaled dimensions (assumes uniform scale, no rotation)
    const m = this._transform;
    const scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
    const scaleY = Math.sqrt(m.c * m.c + m.d * m.d);
    const tw = dw * scaleX;
    const th = dh * scaleY;
    this._elements.push(
      `<image href="${this._escapeAttr(href)}" x="${this._n(tx)}" y="${this._n(ty)}" width="${this._n(tw)}" height="${this._n(th)}" preserveAspectRatio="xMidYMid meet"/>`
    );
  }

  setLineDash(segments: number[]): void {
    this._dashArray = [...segments];
  }

  // ── SVG serialization ──────────────────────────────────────────────────────

  /**
   * Returns the complete SVG document as a string.
   */
  serialize(): string {
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
      `     width="${this._width}" height="${this._height}"`,
      `     viewBox="0 0 ${this._width} ${this._height}">`,
      ...this._elements,
      `</svg>`,
    ].join('\n');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _cssColor(color: string): string {
    return color || 'none';
  }

  private _svgTextAnchor(align: string): string {
    switch (align) {
      case 'center': return 'middle';
      case 'right': case 'end': return 'end';
      default: return 'start';
    }
  }

  private _svgDominantBaseline(baseline: string): string {
    switch (baseline) {
      case 'middle': return 'middle';
      case 'top': case 'hanging': return 'hanging';
      case 'bottom': case 'ideographic': return 'ideographic';
      default: return 'auto';
    }
  }

  private _escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private _escapeText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
