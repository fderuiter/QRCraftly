import { describe, expect, it } from 'vitest';
import { getExportRiskPolicy } from './exportRiskPolicy';
import type { ScannabilityStatus } from '../hooks/useScannability';

describe('getExportRiskPolicy', () => {
  const statuses: ScannabilityStatus[] = [
    'idle',
    'checking',
    'digital-pass',
    'physical-pass',
    'fail',
  ];

  it.each(statuses)('classifies %s without a health result', (status) => {
    const expected = status === 'physical-pass' ? 'safe' : status === 'fail' ? 'unsafe' : 'caution';

    expect(getExportRiskPolicy({ status })).toBe(expected);
  });

  it.each([
    ['idle', 100, 'caution'],
    ['checking', 100, 'caution'],
    ['digital-pass', 79, 'caution'],
    ['digital-pass', 80, 'safe'],
    ['digital-pass', 100, 'safe'],
    ['physical-pass', 79, 'caution'],
    ['physical-pass', 80, 'safe'],
    ['physical-pass', 100, 'safe'],
    ['fail', 100, 'unsafe'],
  ] satisfies Array<[ScannabilityStatus, number, 'safe' | 'caution' | 'unsafe']>)(
    'classifies %s with health %i as %s',
    (status, score, expected) => {
      expect(getExportRiskPolicy({ status, health: { score } })).toBe(expected);
    }
  );

  it.each(['digital-pass', 'physical-pass'] satisfies ScannabilityStatus[])(
    'classifies %s with a critical warning as unsafe',
    (status) => {
      expect(
        getExportRiskPolicy({
          status,
          health: {
            score: 100,
            criticalWarnings: ['critical-contrast'],
          },
        })
      ).toBe('unsafe');
    }
  );
});
