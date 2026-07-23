import jsQR from 'jsqr';
import { ValidationEngine } from '../engine/ValidationEngine';
import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerRequest,
} from './sharedContract';

/**
 * Applies an optical simulation to the image data to mimic physical scanning conditions.
 * @param imageData - The raw image data.
 * @param width - The image width.
 * @param height - The image height.
 * @returns The transformed image data with blur and noise.
 */
function applyOpticalSimulation(imageData: ImageData, width: number, height: number): ImageData {
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const blurRadius = Math.max(1, Math.floor(width * 0.05)); // 5% blur
  
  // Fast box blur (horizontal then vertical)
  const temp = new Uint8ClampedArray(src.length);
  
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let k = -blurRadius; k <= blurRadius; k++) {
        let px = x + k;
        if (px >= 0 && px < width) {
          const idx = (y * width + px) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          count++;
        }
      }
      const outIdx = (y * width + x) * 4;
      temp[outIdx] = r / count;
      temp[outIdx + 1] = g / count;
      temp[outIdx + 2] = b / count;
      temp[outIdx + 3] = src[outIdx + 3];
    }
  }
  
  // Vertical pass + Noise
  const noiseLevel = 10; // Simple noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let k = -blurRadius; k <= blurRadius; k++) {
        let py = y + k;
        if (py >= 0 && py < height) {
          const idx = (py * width + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          count++;
        }
      }
      
      const outIdx = (y * width + x) * 4;
      const noise = (Math.random() - 0.5) * noiseLevel;
      
      dst[outIdx] = Math.min(255, Math.max(0, (r / count) + noise));
      dst[outIdx + 1] = Math.min(255, Math.max(0, (g / count) + noise));
      dst[outIdx + 2] = Math.min(255, Math.max(0, (b / count) + noise));
      dst[outIdx + 3] = src[outIdx + 3];
    }
  }
  
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
