/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import { QRConfig } from '@/types';
import { performScannabilityCheck, ScannabilityResult } from './lib/checker';
import { calculateScannabilityHealth, HealthScore } from './lib/scoring';
import { getExportRiskPolicy, ExportRisk, ScannabilityStatus } from './lib/exportRiskPolicy';

export type { ScannabilityStatus, ExportRisk, ExportRiskPolicyInput } from './lib/exportRiskPolicy';
export type { HealthScore } from './lib/scoring';
export type { ScannabilityResult } from './lib/checker';
export type { ModuleContrastAuditResult, LowContrastCell } from './lib/contrastAudit';

export { calculateScannabilityHealth } from './lib/scoring';
export { getExportRiskPolicy } from './lib/exportRiskPolicy';
export { performScannabilityCheck } from './lib/checker';
export { auditModuleContrast } from './lib/contrastAudit';
export { calculateBlurRadius, applyOpticalSimulationMath } from './lib/opticalSimulation';

export interface ScannabilityEvaluation {
  status: ScannabilityStatus;
  health: HealthScore;
  exportRisk: ExportRisk;
  result: ScannabilityResult;
}

export interface EvaluateScannabilityOptions {
  isTest?: boolean;
  moduleCount?: number;
}

/**
 * Headless evaluator that runs the unified Scannability Health pipeline against
 * pixel data or canvas images and produces an aggregated scannability evaluation report.
 *
 * @param source - Image pixel data with dimensions.
 * @param config - Current QR code configuration profile.
 * @param options - Optional evaluation parameters (e.g. test flags, module count).
 * @returns Complete scannability evaluation outcome.
 */
export function evaluateScannability(
  source: ImageData | { data: Uint8ClampedArray; width: number; height: number },
  config: QRConfig,
  options: EvaluateScannabilityOptions = {}
): ScannabilityEvaluation {
  const isTest = options.isTest ?? (typeof navigator !== 'undefined' ? !!navigator.webdriver : false);
  const result = performScannabilityCheck(
    source,
    source.width,
    source.height,
    isTest,
    options.moduleCount
  );

  const localMetrics =
    result.localContrastViolations !== undefined
      ? { violations: result.localContrastViolations, minContrast: result.minLocalContrast }
      : undefined;

  const health = calculateScannabilityHealth(config, localMetrics);
  const status: ScannabilityStatus = result.success
    ? result.physicalReady
      ? 'physical-pass'
      : 'digital-pass'
    : 'fail';
  const exportRisk = getExportRiskPolicy({ status, health });

  return {
    status,
    health,
    exportRisk,
    result,
  };
}

