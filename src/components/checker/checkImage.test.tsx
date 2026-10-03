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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scan } from '@/packages/optical-scanner';
import { checkQrImage } from './checkImage';

vi.mock('@/packages/optical-scanner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/packages/optical-scanner')>()),
  scan: vi.fn(),
}));

const file = new Blob(['x'], { type: 'image/png' });
const pass = (data: string) => ({ status: 'pass' as const, data, durationMs: 1, corners: null });

describe('checkQrImage (#1036)', () => {
  beforeEach(() => {
    vi.mocked(scan).mockReset();
    vi.stubGlobal('createImageBitmap', undefined);
  });

  it('explains a picture with no code in it', async () => {
    vi.mocked(scan).mockResolvedValue({ status: 'fail', data: null, error: 'NOT_FOUND', durationMs: 1 });
    const outcome = await checkQrImage(file);
    expect(outcome.kind).toBe('unreadable');
    expect(outcome.kind === 'unreadable' && outcome.message).toMatch(/No QR code was found/);
  });

  it('describes what a readable code holds and reports at least the screen scan', async () => {
    vi.mocked(scan).mockResolvedValue(pass('https://example.com/menu'));
    const outcome = await checkQrImage(file);
    expect(outcome.kind).toBe('read');
    if (outcome.kind !== 'read') return;
    expect(outcome.scan.link?.host).toBe('example.com');
    // No bitmap support here, so only the screen scan is reported.
    expect(outcome.status).toBe('digital-pass');
  });

  it('shows no verdict for a script address, which is blocked', async () => {
    vi.mocked(scan).mockResolvedValue(pass('javascript:alert(1)'));
    const outcome = await checkQrImage(file);
    expect(outcome.kind === 'read' && outcome.scan.blocked).toBe(true);
    expect(outcome.kind === 'read' && outcome.status).toBeNull();
  });

  it('upgrades to a print pass when the redrawn code survives the simulation', async () => {
    vi.mocked(scan).mockResolvedValue({ ...pass('https://example.com'), corners: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }] });
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })));
    const drawImage = vi.fn();
    const frame = { data: new Uint8ClampedArray(512 * 512 * 4), width: 512, height: 512 };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage,
      getImageData: vi.fn(() => frame),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.doMock('@/packages/scannability/checker', () => ({
      performScannabilityCheck: vi.fn(() => ({ success: true, physicalReady: true })),
    }));
    const outcome = await checkQrImage(file);
    expect(outcome.kind === 'read' && outcome.status).toBe('physical-pass');
    // The crop is the 80 px code plus a 15% margin each side (104 px), scaled to 512: the picture
    // is drawn 100 * 512 / 104 px wide and shifted right by the 2 px that lie left of the picture.
    const [, dx, dy, dw] = drawImage.mock.calls[0];
    expect(dx).toBeCloseTo((2 * 512) / 104);
    expect(dy).toBeCloseTo((2 * 512) / 104);
    expect(dw).toBeCloseTo((100 * 512) / 104);
    vi.doUnmock('@/packages/scannability/checker');
  });
});
