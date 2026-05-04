import { describe, test, expect } from 'vitest';
import { getLogoMetrics } from './utils';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig, QRErrorCorrectionLevel, QRStyle } from '../../types';
import { renderModules } from './modules';

describe('Performance Benchmark: renderModules (CIRCUIT)', () => {
  test('Benchmark CIRCUIT execution time', () => {
    const moduleCount = 53;
    const cellSize = 10;
    const iterations = 500;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      style: QRStyle.CIRCUIT,
      logoUrl: 'https://example.com/logo.png',
      logoSize: 0.2,
      logoPadding: 1,
      logoPaddingStyle: 'circle',
      errorCorrectionLevel: QRErrorCorrectionLevel.H
    };

    const modules = {
      size: moduleCount,
      get: (r: number, c: number) => (r + c) % 2 === 0
    };

    const logoMetrics = getLogoMetrics(config, moduleCount, cellSize);

    const ctx = {
      fillStyle: '',
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      rect: () => {},
      arc: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {}
    } as any;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderModules(ctx, modules as any, config, 0, 0, cellSize, moduleCount, logoMetrics);
    }
    const end = performance.now();

    console.log(`CIRCUIT Total duration for ${iterations} iterations: ${(end - start).toFixed(2)}ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 10000);
});
