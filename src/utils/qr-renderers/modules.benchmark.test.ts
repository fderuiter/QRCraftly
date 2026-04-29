import { describe, test, expect } from 'vitest';
import { getLogoMetrics } from './utils';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig, QRErrorCorrectionLevel, QRStyle } from '../../types';
import { renderModules } from './modules';

describe('Performance Benchmark: renderModules (HIVE/STARBURST)', () => {
  test('Benchmark HIVE execution time', () => {
    const moduleCount = 53;
    const cellSize = 10;
    const iterations = 500;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      style: QRStyle.HIVE,
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
      stroke: () => {}
    } as any;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderModules(ctx, modules as any, config, 0, 0, cellSize, moduleCount, logoMetrics);
    }
    const end = performance.now();

    console.log(`HIVE Total duration for ${iterations} iterations: ${(end - start).toFixed(2)}ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 10000);

  test('Benchmark STARBURST execution time', () => {
    const moduleCount = 53;
    const cellSize = 10;
    const iterations = 500;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      style: QRStyle.STARBURST,
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
      stroke: () => {}
    } as any;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderModules(ctx, modules as any, config, 0, 0, cellSize, moduleCount, logoMetrics);
    }
    const end = performance.now();

    console.log(`STARBURST Total duration for ${iterations} iterations: ${(end - start).toFixed(2)}ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 10000);
});
