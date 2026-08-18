import jsQR from 'jsqr';
import { isDangerousUrl } from './security';
import { applyOpticalSimulationMath } from './opticalSimulation';

export interface ScannabilityResult {
  success: boolean;
  physicalReady: boolean;
  error?: string | null;
}

/**
 * Shared function to run decoding, security, and optical simulation checks.
 * This is used by both the worker thread and the main-thread fallback to guarantee parity.
 */
export function performScannabilityCheck(
  imageData: ImageData | { data: Uint8ClampedArray; width: number; height: number },
  width: number,
  height: number,
  isTest: boolean
): ScannabilityResult {
  // 1. Digital-only check
  let digitalPass = false;
  let decodedData = '';
  let code = jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
  if (code) {
    digitalPass = true;
    decodedData = code.data;
  } else {
    code = jsQR(imageData.data, width, height, { inversionAttempts: "onlyInvert" });
    if (code) {
      digitalPass = true;
      decodedData = code.data;
    }
  }

  // Security Check: URL / Payload safety
  if (digitalPass && isDangerousUrl(decodedData)) {
    return { success: false, physicalReady: false, error: 'SECURITY_VIOLATION' };
  }

  if (!digitalPass) {
    return { success: false, physicalReady: false, error: 'NOT_FOUND' };
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
    codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "onlyInvert" });
    if (codeSim) physicalPass = true;
  }

  return { success: true, physicalReady: physicalPass };
}
