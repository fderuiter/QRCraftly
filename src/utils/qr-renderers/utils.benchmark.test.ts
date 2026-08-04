import { describe, test, expect } from 'vitest';
import { getLogoMetrics, getIsCoveredByLogo } from './utils';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig, QRErrorCorrectionLevel } from '../../types';

describe('Performance Benchmark: getIsCoveredByLogo', () => {
  test('Benchmark execution time', () => {
    const moduleCount = 53; // Version 10 QR Code
    const cellSize = 10;
    const iterations = 50000;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      logoUrl: 'https://example.com/logo.png',
      logoSize: 0.2,
      logoPadding: 1,
      logoPaddingStyle: 'circle',
      errorCorrectionLevel: QRErrorCorrectionLevel.H
    };

    const metrics = getLogoMetrics(config, moduleCount, cellSize);
    const isCovered = getIsCoveredByLogo(config, moduleCount, metrics);

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          isCovered(r, c);
        }
      }
    }

    const end = performance.now();
    const duration = end - start;

    console.log(`\nBenchmark Results:`);
    console.log(`Total duration for ${iterations} iterations (x ${moduleCount*moduleCount} calls): ${duration.toFixed(2)}ms`);
    console.log(`Average time per iteration: ${(duration / iterations).toFixed(4)}ms`);
    console.log(`Average time per call: ${(duration / (iterations * moduleCount * moduleCount)).toFixed(6)}ms\n`);

    // Ensure it runs within the calibrated timing budget to prevent performance regressions
    expect(duration).toBeLessThan(600);
  }, 10000);
});
