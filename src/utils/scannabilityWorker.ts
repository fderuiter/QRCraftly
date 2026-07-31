import jsQR from 'jsqr';
import { ValidationEngine } from '../engine/ValidationEngine';
import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerRequest,
} from './sharedContract';
import { applyOpticalSimulationMath } from './opticalSimulation';

/**
 * Applies an optical simulation to the image data to mimic physical scanning conditions.
 * @param imageData - The raw image data.
 * @param width - The image width.
 * @param height - The image height.
 * @returns The transformed image data with blur and noise.
 */
function applyOpticalSimulation(imageData: ImageData, width: number, height: number): ImageData {
  const dst = applyOpticalSimulationMath(imageData.data, width, height);
  return new ImageData(dst, width, height);
}

/**
 * Handles incoming messages to process QR code scannability.
 * @param e - The message event containing worker data.
 */
self.onmessage = (e: MessageEvent<unknown>) => {
  let configId: string | undefined;
  try {
    if (e.data && typeof e.data === 'object') {
      configId = (e.data as any).configId;
    }

    // Utilize both isWorkerRequest type-guard and assertWorkerRequest assertion
    if (!isWorkerRequest(e.data)) {
      assertWorkerRequest(e.data);
    } else {
      assertWorkerRequest(e.data);
    }

    const { imageData, width, height, isTest } = e.data;
    
    // Check digital-only
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

    if (digitalPass && ValidationEngine.isDangerousUrl(decodedData)) {
      const response = { success: false, physicalReady: false, error: 'SECURITY_VIOLATION', configId };
      assertWorkerResponse(response);
      self.postMessage(response);
      return;
    }

    if (!digitalPass) {
      const response = { success: false, physicalReady: false, error: 'NOT_FOUND', configId };
      assertWorkerResponse(response);
      self.postMessage(response);
      return;
    }

    // Apply optical simulation
    const simulatedData = isTest ? (imageData as ImageData) : applyOpticalSimulation(imageData as ImageData, width, height);
    let physicalPass = false;
    let codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "dontInvert" });
    if (codeSim) {
      physicalPass = true;
    } else {
      codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "attemptBoth" });
      if (codeSim) physicalPass = true;
    }

    const response = { success: true, physicalReady: physicalPass, configId };
    assertWorkerResponse(response);
    self.postMessage(response);
    
  } catch (_err) {
    const isValidationError = _err instanceof Error && (_err.message.includes('Worker request') || _err.message.includes('Worker response'));
    const response = {
      success: false,
      physicalReady: false,
      error: isValidationError ? 'VALIDATION_ERROR' : 'CRASH',
      configId
    };
    try {
      assertWorkerResponse(response);
      self.postMessage(response);
    } catch {
      self.postMessage({ success: false, physicalReady: false, error: 'CRASH', configId });
    }
  }
};
