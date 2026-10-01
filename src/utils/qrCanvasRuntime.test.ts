import { describe, it, expect, vi } from 'vitest';
import QRCode from 'qrcode';
import { fromQrcodePackage, type QrEncoder } from '@/packages/qr-matrix';
import * as qrCanvasRuntime from './qrCanvasRuntime';
import { QRErrorCorrectionLevel } from '../types';

describe('qrCanvasRuntime', () => {
  it('spawns no workers where Web Workers do not exist', () => {
    const runtime = qrCanvasRuntime.getQrCanvasRuntime();
    expect(runtime.createMatrixWorker()).toBeNull();
    expect(runtime.createMazeWorker()).toBeNull();
  });

  it('loads the real qrcode encoder asynchronously by default', async () => {
    const encoder = await qrCanvasRuntime.getQrCanvasRuntime().loadEncoder();
    const { modules } = encoder.create('https://qrcraftly.com', { errorCorrectionLevel: QRErrorCorrectionLevel.M });
    expect(modules.size).toBeGreaterThanOrEqual(21);
    // Top-left Finder Pattern corner is always dark
    expect(modules.get(0, 0)).toBe(true);
  });

  it('adapts qrcode modules to booleans', () => {
    const encoder = fromQrcodePackage(QRCode);
    const { modules } = encoder.create('hello', { errorCorrectionLevel: QRErrorCorrectionLevel.L });
    for (let c = 0; c < modules.size; c++) {
      expect(typeof modules.get(0, c)).toBe('boolean');
    }
  });

  it('allows mocking runtime via Vitest spies and restoring previous runtime', () => {
    const before = qrCanvasRuntime.getQrCanvasRuntime();
    const fake: QrEncoder = { create: () => ({ modules: { size: 1, get: () => true } }) };

    const spy = vi.spyOn(qrCanvasRuntime, 'getQrCanvasRuntime').mockReturnValue({
      ...before,
      loadEncoder: () => fake,
    });

    expect(qrCanvasRuntime.getQrCanvasRuntime().loadEncoder()).toBe(fake);
    expect(qrCanvasRuntime.getQrCanvasRuntime().createMatrixWorker).toBe(before.createMatrixWorker);

    spy.mockRestore();
    expect(qrCanvasRuntime.getQrCanvasRuntime()).toBe(before);
  });
});
