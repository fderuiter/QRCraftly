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

import jsQR from 'jsqr';
import { isDangerousUrl } from '@/utils/security';
import { applyOpticalSimulationMath } from './opticalSimulation';
import { auditModuleContrast } from './contrastAudit';

export interface ScannabilityResult {
  success: boolean;
  physicalReady: boolean;
  error?: string | null;
  localContrastViolations?: number;
  minLocalContrast?: number;
}

/**
 * Shared evaluation engine to run localized module contrast checks, two-pass barcode decoding,
 * security inspection, and optical print degradation simulation.
 *
 * Guarantees exact parity across Web Worker and main-thread fallback execution.
 */
export function performScannabilityCheck(
  imageData: ImageData | { data: Uint8ClampedArray; width: number; height: number },
  width: number,
  height: number,
  isTest: boolean,
  moduleCount?: number
): ScannabilityResult {
  // 0. Localized module contrast audit
  let localContrastViolations = 0;
  let minLocalContrast = 21;

  if (moduleCount && moduleCount > 0) {
    const audit = auditModuleContrast({ data: imageData.data, width, height }, moduleCount);
    localContrastViolations = audit.violations;
    minLocalContrast = audit.minContrast;
  }

  // 1. Digital-only check (Pass 1: Normal polarity, Pass 2: Inverted polarity)
  let digitalPass = false;
  let decodedData = '';
  let code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
  if (code) {
    digitalPass = true;
    decodedData = code.data;
  } else {
    code = jsQR(imageData.data, width, height, { inversionAttempts: 'onlyInvert' });
    if (code) {
      digitalPass = true;
      decodedData = code.data;
    }
  }

  // Security Check: URL / Payload safety
  if (digitalPass && isDangerousUrl(decodedData)) {
    return {
      success: false,
      physicalReady: false,
      error: 'SECURITY_VIOLATION',
      localContrastViolations,
      minLocalContrast,
    };
  }

  if (!digitalPass) {
    return {
      success: false,
      physicalReady: false,
      error: 'NOT_FOUND',
      localContrastViolations,
      minLocalContrast,
    };
  }

  // 2. Optical simulation & physical check
  let physicalPass = false;
  let simulatedData: ImageData | { data: Uint8ClampedArray; width: number; height: number };

  if (isTest) {
    simulatedData = imageData;
  } else {
    const dst = applyOpticalSimulationMath(imageData.data, width, height);
    simulatedData = { data: dst, width, height };
  }

  let codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: 'dontInvert' });
  if (codeSim) {
    physicalPass = true;
  } else {
    codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: 'onlyInvert' });
    if (codeSim) physicalPass = true;
  }

  return {
    success: true,
    physicalReady: physicalPass,
    localContrastViolations,
    minLocalContrast,
  };
}

