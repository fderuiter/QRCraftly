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

import { describe, it, expect, vi } from 'vitest';
import { TransferSession, sanitizeStreamConfig, PreallocatedFramePool } from '../sender';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '@/types';

const mockConfig: QRConfig = {
  value: 'Test Transfer',
  type: QRType.TEXT,
  fgColor: '#000000',
  bgColor: '#ffffff',
  style: QRStyle.MODERN,
  logoUrl: 'https://example.com/logo.png',
  logoSize: 0.2,
  logoPaddingStyle: 'none',
  logoPadding: 1,
  logoBackgroundColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: QRErrorCorrectionLevel.Q,
  isBorderEnabled: true,
  borderSize: 0.05,
  borderColor: '#000000',
  borderStyle: 'solid',
  borderText: 'QRCraftly',
  borderTextPosition: 'bottom-center',
  borderTextColor: '#ffffff',
  borderLogoUrl: null,
  borderLogoPosition: 'bottom-center',
  socialFormat: SocialFormat.PORTRAIT_4_5,
  templateStyle: TemplateStyle.MINIMALIST,
  templateHeadline: 'Scan Me',
  templateSubtext: 'Subtext',
  templateQrScale: 1.0,
};

describe('Optical Transfer Sender Engine', () => {
  it('should sanitize visual configurations for high-density transfer stream frames', () => {
    const sanitized = sanitizeStreamConfig(mockConfig);

    expect(sanitized.style).toBe(QRStyle.STANDARD);
    expect(sanitized.logoUrl).toBeNull();
    expect(sanitized.logoSize).toBe(0);
    expect(sanitized.isBorderEnabled).toBe(false);
    expect(sanitized.templateStyle).toBe(TemplateStyle.NONE);
    expect(sanitized.socialFormat).toBe(SocialFormat.SQUARE_1_1);
  });

  it('should store and recycle frames inside PreallocatedFramePool without allocations', () => {
    const pool = new PreallocatedFramePool(10, 50 * 50);
    const mockData = new Uint8Array(50 * 50).fill(1);

    const frame = pool.storeFrame(0, 50, mockData);
    expect(frame.index).toBe(0);
    expect(frame.size).toBe(50);
    expect(pool.hasFrame(0)).toBe(true);
    expect(pool.size).toBe(1);

    const retrieved = pool.getFrame(0);
    expect(retrieved).toBeDefined();
    expect(retrieved?.data[0]).toBe(1);

    pool.delete(0);
    expect(pool.hasFrame(0)).toBe(false);
    expect(pool.size).toBe(0);
  });

  it('should initialize and step frames off-DOM deterministically', () => {
    const file = new Blob(['Mock transfer payload for off-DOM testing'], { type: 'text/plain' });
    const onFrame = vi.fn();

    const session = new TransferSession(file, { config: mockConfig }, { onFrame });
    expect(session.totalFrames).toBe(0);
    expect(session.currentFrameIndex).toBe(0);

    // Stepping without frames in pool returns null gracefully
    const frame = session.step();
    expect(frame).toBeNull();
    expect(onFrame).not.toHaveBeenCalled();

    session.destroy();
  });
});
