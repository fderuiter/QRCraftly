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

import { describe, it, expect } from 'vitest';
import { SvgContext } from './svgContext';

describe('SvgContext', () => {
  describe('serialize', () => {
    it('produces a valid SVG wrapper', () => {
      const ctx = new SvgContext(100, 100);
      const svg = ctx.serialize();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="100"');
      expect(svg).toContain('viewBox="0 0 100 100"');
    });
  });

  describe('fillRect', () => {
    it('emits a <path> element with fill color', () => {
      const ctx = new SvgContext(200, 200);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(10, 10, 50, 50);
      const svg = ctx.serialize();
      expect(svg).toContain('fill="#ff0000"');
      // Should form a closed rect path
      expect(svg).toContain('<path');
    });
  });

  describe('strokeRect', () => {
    it('emits a <path> with stroke and no fill', () => {
      const ctx = new SvgContext(200, 200);
      ctx.strokeStyle = '#0000ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, 40, 40);
      const svg = ctx.serialize();
      expect(svg).toContain('stroke="#0000ff"');
      expect(svg).toContain('fill="none"');
      expect(svg).toContain('stroke-width="2"');
    });

    it('includes stroke-dasharray when setLineDash is called', () => {
      const ctx = new SvgContext(200, 200);
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(0, 0, 100, 100);
      const svg = ctx.serialize();
      expect(svg).toContain('stroke-dasharray="8 4"');
    });
  });

  describe('path operations', () => {
    it('fill() emits path element with current fillStyle', () => {
      const ctx = new SvgContext(200, 200);
      ctx.fillStyle = '#123456';
      ctx.beginPath();
      ctx.rect(10, 10, 30, 30);
      ctx.fill();
      const svg = ctx.serialize();
      expect(svg).toContain('fill="#123456"');
      expect(svg).toContain('<path');
    });

    it('fill() does nothing when path is empty', () => {
      const ctx = new SvgContext(200, 200);
      ctx.beginPath();
      ctx.fill(); // no path commands
      const svg = ctx.serialize();
      // Only the SVG wrapper, no paths
      expect(svg).not.toContain('<path');
    });

    it('moveTo/lineTo/closePath builds correct path data', () => {
      const ctx = new SvgContext(200, 200);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(100, 100);
      ctx.closePath();
      ctx.fill();
      const svg = ctx.serialize();
      expect(svg).toContain('M 0 0');
      expect(svg).toContain('L 100 0');
      expect(svg).toContain('L 100 100');
      expect(svg).toContain('Z');
    });

    it('arc draws a full circle as two half-arcs', () => {
      const ctx = new SvgContext(200, 200);
      ctx.beginPath();
      ctx.arc(50, 50, 20, 0, Math.PI * 2);
      ctx.fill();
      const svg = ctx.serialize();
      // Full circle uses two A commands
      const aCount = (svg.match(/ A /g) || []).length;
      expect(aCount).toBe(2);
    });

    it('roundRect produces a closed path with Q curve commands', () => {
      const ctx = new SvgContext(200, 200);
      ctx.beginPath();
      // @ts-ignore - roundRect is conditionally available on CanvasRenderingContext2D
      ctx.roundRect(10, 10, 80, 80, 10);
      ctx.fill();
      const svg = ctx.serialize();
      // Q = quadratic Bezier (used for corner curves)
      expect(svg).toContain('Q');
    });

    it('quadraticCurveTo emits Q path command', () => {
      const ctx = new SvgContext(200, 200);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(50, 0, 50, 50);
      ctx.fill();
      const svg = ctx.serialize();
      expect(svg).toContain('Q');
    });
  });

  describe('transforms', () => {
    it('translate shifts coordinates', () => {
      const ctx = new SvgContext(200, 200);
      ctx.translate(10, 20);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fill();
      const svg = ctx.serialize();
      // moveTo(0,0) after translate(10,20) should result in point (10,20)
      expect(svg).toContain('M 10 20');
    });

    it('save/restore restores fillStyle and transform', () => {
      const ctx = new SvgContext(200, 200);
      ctx.fillStyle = '#aabbcc';
      ctx.save();
      ctx.fillStyle = '#112233';
      ctx.translate(50, 50);
      ctx.restore();
      // After restore, fillStyle is back
      expect(ctx.fillStyle).toBe('#aabbcc');
      // And translate is undone
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fill();
      const svg = ctx.serialize();
      expect(svg).toContain('M 0 0');
    });

    it('rotate transforms rect corners', () => {
      const ctx = new SvgContext(200, 200);
      // A small rotation should move the corners
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate(0.1);
      ctx.fillRect(-10, -10, 20, 20);
      ctx.restore();
      const svg = ctx.serialize();
      // The rect should have been drawn but with rotated coordinates (non-trivial values)
      expect(svg).toContain('<path');
    });
  });

  describe('fillText', () => {
    it('emits a <text> element', () => {
      const ctx = new SvgContext(200, 200);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Hello', 100, 50);
      const svg = ctx.serialize();
      expect(svg).toContain('<text');
      expect(svg).toContain('Hello');
      expect(svg).toContain('text-anchor="middle"');
      expect(svg).toContain('dominant-baseline="middle"');
    });

    it('escapes special characters in text', () => {
      const ctx = new SvgContext(200, 200);
      ctx.fillText('<scan&me>', 10, 10);
      const svg = ctx.serialize();
      expect(svg).toContain('&lt;scan&amp;me&gt;');
    });
  });

  describe('drawImage', () => {
    it('emits an <image> element with the given src', () => {
      const ctx = new SvgContext(200, 200);
      const img = { src: 'data:image/png;base64,abc123' } as HTMLImageElement;
      ctx.drawImage(img, 10, 10, 50, 50);
      const svg = ctx.serialize();
      expect(svg).toContain('<image');
      expect(svg).toContain('data:image/png;base64,abc123');
    });

    it('skips drawImage when src is empty', () => {
      const ctx = new SvgContext(200, 200);
      const img = { src: '' } as HTMLImageElement;
      ctx.drawImage(img, 10, 10, 50, 50);
      const svg = ctx.serialize();
      expect(svg).not.toContain('<image');
    });
  });

  describe('clearRect', () => {
    it('is a no-op and does not add elements', () => {
      const ctx = new SvgContext(200, 200);
      ctx.clearRect(0, 0, 200, 200);
      const svg = ctx.serialize();
      expect(svg).not.toContain('<path');
      expect(svg).not.toContain('<rect');
    });
  });

  describe('setLineDash', () => {
    it('resets dash when called with empty array', () => {
      const ctx = new SvgContext(200, 200);
      ctx.setLineDash([5, 5]);
      ctx.setLineDash([]);
      ctx.strokeRect(0, 0, 50, 50);
      const svg = ctx.serialize();
      expect(svg).not.toContain('stroke-dasharray');
    });
  });

  describe('accessibility metadata', () => {
    it('serializes title and desc elements directly underneath the opening svg tag', () => {
      const ctx = new SvgContext(100, 100, 'Test Title', 'Test Description');
      const svg = ctx.serialize();
      expect(svg).toContain('<title>Test Title</title>');
      expect(svg).toContain('<desc>Test Description</desc>');

      // Verify they are positioned directly after the opening svg tag
      const lines = svg.split('\n');
      const svgOpenTagIndex = lines.findIndex(line => line.startsWith('<svg'));
      expect(svgOpenTagIndex).toBeGreaterThanOrEqual(0);
      expect(lines[svgOpenTagIndex + 3]).toBe('  <title>Test Title</title>');
      expect(lines[svgOpenTagIndex + 4]).toBe('  <desc>Test Description</desc>');
    });

    it('cleanly omits title and desc tags if they are not provided', () => {
      const ctx = new SvgContext(100, 100);
      const svg = ctx.serialize();
      expect(svg).not.toContain('<title>');
      expect(svg).not.toContain('</title>');
      expect(svg).not.toContain('<desc>');
      expect(svg).not.toContain('</desc>');
    });

    it('escapes special characters inside title and description', () => {
      const ctx = new SvgContext(100, 100, 'Custom <Title> & More', 'Special <Description> & Payload');
      const svg = ctx.serialize();
      expect(svg).toContain('<title>Custom &lt;Title&gt; &amp; More</title>');
      expect(svg).toContain('<desc>Special &lt;Description&gt; &amp; Payload</desc>');
    });
  });
});
