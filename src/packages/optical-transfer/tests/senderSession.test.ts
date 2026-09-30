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

  it('recycles PreallocatedFramePool slots so an unbounded stream never grows the buffer', () => {
    const pool = new PreallocatedFramePool(4, 45 * 45);
    const bytes = pool.byteLength;
    const frame = new Uint8Array(45 * 45);

    // Rateless playback: a lookahead of 3 frames live at a time, 10k frames total.
    for (let index = 0; index < 10_000; index++) {
      frame[0] = index & 0xff;
      pool.storeFrame(index, 45, frame);
      if (index >= 3) {
        expect(pool.getFrame(index - 3)?.data[0]).toBe((index - 3) & 0xff);
        pool.releaseFrame(index - 3);
      }
    }
    expect(pool.size).toBe(3);
    expect(pool.byteLength).toBe(bytes);
    expect(pool.slotCapacity).toBe(4);

    // Re-storing a live index reuses its slot.
    pool.storeFrame(9_999, 45, frame);
    expect(pool.size).toBe(3);
    expect(() => pool.storeFrame(1, 46, new Uint8Array(46 * 46))).toThrow(RangeError);
  });

  it('grows the pool only when every slot is live and keeps existing frame data intact', () => {
    const pool = new PreallocatedFramePool(2, 21 * 21);
    pool.storeFrame(0, 21, new Uint8Array(441).fill(7));
    pool.storeFrame(1, 21, new Uint8Array(441).fill(8));
    pool.storeFrame(2, 21, new Uint8Array(441).fill(9));
    expect(pool.slotCapacity).toBe(4);
    expect(pool.getFrame(0)?.data[440]).toBe(7);
    expect(pool.getFrame(1)?.data[0]).toBe(8);
    expect(pool.getFrame(2)?.data[0]).toBe(9);
    pool.clear();
    expect(pool.size).toBe(0);
    expect(pool.slotCapacity).toBe(4);
  });

  it('runs the fountain stream lifecycle: INITIALIZED, frames past K, no wrap or restart', () => {
    const file = new Blob(['fountain lifecycle']);
    const onInitialized = vi.fn();
    const onFrame = vi.fn();
    const onError = vi.fn();
    const session = new TransferSession(file, { config: mockConfig }, { onInitialized, onFrame, onError });
    expect(session.fountainMode).toBe(true);

    session.handleWorkerMessage({ type: 'INITIALIZED', totalFrames: 2, chunkSize: 40, sha256: 'abc', fountain: { k: 2, symbolSize: 40, compression: 'none', messageLength: 70 } });
    expect(onInitialized).toHaveBeenCalledWith(2, 40, 'abc');
    expect(session.symbolSize).toBe(40);

    for (let index = 0; index < 5; index++) {
      session.handleWorkerMessage({ type: 'FRAME', index, total: 2, size: 21, data: new Uint8Array(441) });
      const frame = session.step();
      expect(frame?.index).toBe(index);
      expect(frame?.isHandshake).toBe(false);
    }
    // Rateless: the index keeps increasing instead of wrapping at K.
    expect(session.currentFrameIndex).toBe(5);

    session.handleWorkerMessage({ type: 'ERROR', message: 'boom' });
    expect(onError).toHaveBeenCalledWith('boom');
    session.destroy();
  });

  it('keeps the legacy carousel wrap when fountain mode is disabled', () => {
    const session = new TransferSession(new Blob(['legacy']), { config: mockConfig, fountainMode: false });
    session.handleWorkerMessage({ type: 'INITIALIZED', totalFrames: 2, chunkSize: 180, sha256: '', fountain: null });
    session.handleWorkerMessage({ type: 'FRAME', index: 0, total: 2, size: 21, data: new Uint8Array(441) });
    expect(session.step()?.isHandshake).toBe(true);
    session.handleWorkerMessage({ type: 'FRAME', index: 1, total: 2, size: 21, data: new Uint8Array(441) });
    session.step();
    expect(session.currentFrameIndex).toBe(0);
    session.destroy();
  });

  it('starts and stops timed playback', () => {
    vi.useFakeTimers();
    const onFrame = vi.fn();
    const session = new TransferSession(new Blob(['timer']), { config: mockConfig, fps: 20 }, { onFrame });
    session.handleWorkerMessage({ type: 'FRAME', index: 0, total: 1, size: 21, data: new Uint8Array(441) });
    session.start();
    expect(session.isRunning).toBe(true);
    vi.advanceTimersByTime(60);
    expect(onFrame).toHaveBeenCalledTimes(1);
    session.stop();
    expect(session.isRunning).toBe(false);
    session.destroy();
    vi.useRealTimers();
  });
});
