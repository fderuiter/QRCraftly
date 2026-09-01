import type { ScannabilityStatus } from '../hooks/useScannability';

export type ExportRisk = 'safe' | 'caution' | 'unsafe';

interface ExportRiskPolicyInput {
  status: ScannabilityStatus;
  health?: {
    score: number;
    warnings?: string[];
    criticalWarnings?: string[];
  };
}

/**
 * Classifies whether an export can proceed normally, needs guidance, or needs confirmation.
 * @param input - Current Scannability Health evidence.
 * @returns The shared risk classification for every export surface.
 */
export function getExportRiskPolicy({ status, health }: ExportRiskPolicyInput): ExportRisk {
  if (status === 'fail' || health?.criticalWarnings?.length) {
    return 'unsafe';
  }

  if (status === 'physical-pass' && !health) {
    return 'safe';
  }

  if (status === 'idle' || status === 'checking' || !health || health.score < 80) {
    return 'caution';
  }

  return 'safe';
}
