import { describe, test, expect } from 'vitest';
import { getLogoMetrics } from './utils';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig, QRErrorCorrectionLevel, QRStyle } from '../../types';
import { renderModules } from './modules';

describe('Performance Benchmark: renderModules', () => {
  const runBenchmark = (style: QRStyle, name: string) => {
    const moduleCount = 53;
    const cellSize = 10;
    const iterations = 500;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      style,
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
      roundRect: () => {}
    } as any;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderModules(ctx, modules as any, config, 0, 0, cellSize, moduleCount, logoMetrics);
    }
    const end = performance.now();

    console.log(`${name} Total duration for ${iterations} iterations: ${(end - start).toFixed(2)}ms`);
    expect(end - start).toBeGreaterThan(0);
  };

  test('Benchmark HIVE execution time', () => runBenchmark(QRStyle.HIVE, 'HIVE'), 10000);
  test('Benchmark STARBURST execution time', () => runBenchmark(QRStyle.STARBURST, 'STARBURST'), 10000);
  test('Benchmark MODERN execution time', () => runBenchmark(QRStyle.MODERN, 'MODERN'), 10000);
  test('Benchmark CIRCUIT execution time', () => runBenchmark(QRStyle.CIRCUIT, 'CIRCUIT'), 10000);
  test('Benchmark SWISS execution time', () => runBenchmark(QRStyle.SWISS, 'SWISS'), 10000);
  test('Benchmark STANDARD execution time', () => runBenchmark(QRStyle.STANDARD, 'STANDARD'), 10000);
});
