import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerRequest,
} from './sharedContract';
import jsQR from 'jsqr';
import { isDangerousUrl } from './security';
import { applyOpticalSimulationMath } from './opticalSimulation';

let latestConfigId: string | undefined | null = undefined;
let cachedCanvas: OffscreenCanvas | null = null;
let cachedCtx: OffscreenCanvasRenderingContext2D | null = null;
let cachedDstBuffer: Uint8ClampedArray | null = null;
let cachedTempBuffer: Uint8ClampedArray | null = null;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Handles incoming messages to process QR code scannability.
 * @param e - The message event containing worker data.
 */
self.onmessage = async (e: MessageEvent<unknown>) => {
  let configId: string | undefined;
  try {
    if (e.data && typeof e.data === 'object') {
      configId = (e.data as any).configId;
    }

    if (configId !== undefined) {
      latestConfigId = configId;
    }

    // Yield immediately to let incoming messages register and cancel stale requests
    await yieldToEventLoop();

    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    // Utilize both isWorkerRequest type-guard and assertWorkerRequest assertion
    if (!isWorkerRequest(e.data)) {
      assertWorkerRequest(e.data);
    } else {
      assertWorkerRequest(e.data);
    }

    const { imageData: reqImageData, imageBitmap, width, height, isTest } = e.data;

    let imageData: { data: Uint8ClampedArray; width: number; height: number };

    if (imageBitmap) {
      if (typeof OffscreenCanvas !== 'undefined') {
        if (!cachedCanvas || cachedCanvas.width !== width || cachedCanvas.height !== height) {
          cachedCanvas = new OffscreenCanvas(width, height);
          cachedCtx = cachedCanvas.getContext('2d');
        }
        const ctx = cachedCtx;
        if (!ctx) {
          throw new Error('Failed to get 2d context on OffscreenCanvas');
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(imageBitmap, 0, 0);
        const extracted = ctx.getImageData(0, 0, width, height);
        imageData = { data: extracted.data, width, height };
        imageBitmap.close();
      } else {
        throw new Error('OffscreenCanvas is not supported in this environment');
      }
    } else if (reqImageData) {
      imageData = reqImageData as any;
    } else {
      throw new Error('Neither imageData nor imageBitmap provided');
    }

    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    // Step 1: Digital-only check
    let digitalCheckOk = false;
    let decodedData = '';
    
    // Check jsQR
    let code = jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
    if (code) {
      digitalCheckOk = true;
      decodedData = code.data;
    } else {
      // Yield to let any newer message cancel this
      await yieldToEventLoop();
      if (configId !== undefined && latestConfigId !== configId) {
        return;
      }
      
      code = jsQR(imageData.data, width, height, { inversionAttempts: "onlyInvert" });
      if (code) {
        digitalCheckOk = true;
        decodedData = code.data;
      }
    }

    // Security Check: URL / Payload safety
    if (digitalCheckOk && isDangerousUrl(decodedData)) {
      const response = {
        success: false,
        physicalReady: false,
        error: 'SECURITY_VIOLATION',
        configId
      };
      assertWorkerResponse(response);
      self.postMessage(response);
      return;
    }

    if (!digitalCheckOk) {
      const response = {
        success: false,
        physicalReady: false,
        error: 'NOT_FOUND',
        configId
      };
      assertWorkerResponse(response);
      self.postMessage(response);
      return;
    }

    // Yield to let any newer message cancel this
    await yieldToEventLoop();
    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    // Step 2: Optical simulation & physical check
    let physicalCheckOk = false;
    let simulatedData: ImageData | { data: Uint8ClampedArray; width: number; height: number };

    if (isTest) {
      simulatedData = imageData;
    } else {
      const bufferLength = width * height * 4;
      if (!cachedDstBuffer || cachedDstBuffer.length !== bufferLength) {
        cachedDstBuffer = new Uint8ClampedArray(bufferLength);
      }
      if (!cachedTempBuffer || cachedTempBuffer.length !== bufferLength) {
        cachedTempBuffer = new Uint8ClampedArray(bufferLength);
      }
      const dst = applyOpticalSimulationMath(imageData.data, width, height, 10, cachedDstBuffer, cachedTempBuffer);
      simulatedData = { data: dst, width, height };
    }

    // Yield to let any newer message cancel this
    await yieldToEventLoop();
    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    let codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "dontInvert" });
    if (codeSim) {
      physicalCheckOk = true;
    } else {
      // Yield to let any newer message cancel this
      await yieldToEventLoop();
      if (configId !== undefined && latestConfigId !== configId) {
        return;
      }
      
      codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "onlyInvert" });
      if (codeSim) physicalCheckOk = true;
    }

    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    const response = {
      success: true,
      physicalReady: physicalCheckOk,
      configId
    };
    assertWorkerResponse(response);
    self.postMessage(response);
    
  } catch (_err) {
    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }
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

