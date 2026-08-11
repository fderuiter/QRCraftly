import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerRequest,
} from './sharedContract';
import { performScannabilityCheck } from './scannabilityChecker';

let latestConfigId: string | undefined | null = undefined;

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

    const { imageData, width, height, isTest } = e.data;

    const result = performScannabilityCheck(imageData as ImageData, width, height, !!isTest);

    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    const response = {
      success: result.success,
      physicalReady: result.physicalReady,
      error: result.error,
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

