import jsQR from 'jsqr';
import { isDangerousUrl } from './security';
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
 * Shared function to run decoding, security, optical simulation, and localized module contrast checks.
 * This is used by both the worker thread and the main-thread fallback to guarantee parity.
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

  // 1. Digital-only check
  let digitalPass = false;
  let decodedData = '';
  let code = jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
  if (code) {
    digitalPass = true;
    decodedData = code.data;
  } else {
    code = jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" });
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

  let codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "dontInvert" });
  if (codeSim) {
    physicalPass = true;
  } else {
    codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "attemptBoth" });
    if (codeSim) physicalPass = true;
  }

  return {
    success: true,
    physicalReady: physicalPass,
    localContrastViolations,
    minLocalContrast,
  };
}
