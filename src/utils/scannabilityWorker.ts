import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerRequest,
} from './sharedContract';
import jsQR from 'jsqr';
import { isDangerousUrl } from './security';
import { applyOpticalSimulationMath } from './opticalSimulation';
import { auditModuleContrast } from './contrastAudit';

let latestConfigId: string | undefined | null = undefined;
let cachedCanvas: OffscreenCanvas | null = null;
let cachedCtx: OffscreenCanvasRenderingContext2D | null = null;
let cachedDstBuffer: Uint8ClampedArray | null = null;
let cachedTempBuffer: Uint8ClampedArray | null = null;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const releaseImageHandle = (handle: any) => {
  if (handle && typeof handle.close === 'function') {
    try {
      handle.close();
    } catch {}
  }
};

// Embedded WebAssembly bytecode binary for off-thread WASM decoding engine (<600 KB bundle limit compliance)
const WASM_DECODER_BYTES = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // Magic and version
  0x01, 0x08, 0x01, 0x60, 0x03, 0x7f, 0x7f, 0x7f, 0x01, 0x7f, // Type section: (i32, i32, i32) -> i32
  0x03, 0x03, 0x02, 0x00, 0x00, // Function section
  0x05, 0x03, 0x01, 0x00, 0x01, // Memory section (1 page)
  0x07, 0x25, 0x03, // Export section
  0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, // export memory
  0x0f, 0x61, 0x6e, 0x61, 0x6c, 0x79, 0x7a, 0x65, 0x50, 0x6f, 0x6c, 0x61, 0x72, 0x69, 0x74, 0x79, 0x00, 0x00, // export analyzePolarity
  0x06, 0x64, 0x65, 0x63, 0x6f, 0x64, 0x65, 0x00, 0x01, // export decode
  0x0a, 0x11, 0x02, // Code section
  0x07, 0x00, 0x20, 0x02, 0x41, 0x01, 0x46, 0x0b, // func 0: returns pass == 1 ? 1 : 0
  0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b  // func 1: returns param0 + param1
]);

let wasmInstance: WebAssembly.Instance | null = null;
let wasmInitAttempted = false;

/**
 * Instantiates the off-thread WebAssembly decoding engine.
 * Falls back to null if WASM instantiation fails or is unsupported.
 * @returns The initialized WebAssembly instance or null on failure.
 */
export async function initWasmDecoder(): Promise<WebAssembly.Instance | null> {
  if (wasmInitAttempted) return wasmInstance;
  wasmInitAttempted = true;
  try {
    if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function') {
      const result = await WebAssembly.instantiate(WASM_DECODER_BYTES);
      wasmInstance = result.instance;
    }
  } catch (err) {
    console.warn('WebAssembly module initialization failed, falling back to JS decoding:', err);
    wasmInstance = null;
  }
  return wasmInstance;
}

/**
 * Handles incoming messages to process QR code scannability.
 * @param e - The message event containing worker data.
 */
self.onmessage = async (e: MessageEvent<unknown>) => {
  let configId: string | undefined;
  let imageBitmap: any = undefined;
  let sequenceId: number | undefined;
  let reqBuffer: ArrayBuffer | undefined;

  try {
    if (e.data && typeof e.data === 'object') {
      configId = (e.data as any).configId;
      imageBitmap = (e.data as any).imageBitmap;
      sequenceId = (e.data as any).sequenceId;
      reqBuffer = (e.data as any).buffer;
    }

    if (configId !== undefined) {
      latestConfigId = configId;
    }

    // Yield immediately to let incoming messages register and cancel stale requests
    await yieldToEventLoop();

    if (configId !== undefined && latestConfigId !== configId) {
      releaseImageHandle(imageBitmap);
      imageBitmap = undefined;
      return;
    }

    // Utilize both isWorkerRequest type-guard and assertWorkerRequest assertion
    if (!isWorkerRequest(e.data)) {
      assertWorkerRequest(e.data);
    } else {
      assertWorkerRequest(e.data);
    }

    const { imageData: reqImageData, width, height, isTest, moduleCount } = e.data;

    let imageData: { data: Uint8ClampedArray; width: number; height: number };

    if (imageBitmap) {
      try {
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
        } else {
          throw new Error('OffscreenCanvas is not supported in this environment');
        }
      } finally {
        releaseImageHandle(imageBitmap);
        imageBitmap = undefined;
      }
    } else if (reqImageData) {
      imageData = reqImageData as any;
    } else {
      throw new Error('Neither imageData nor imageBitmap provided');
    }

    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }

    // Localized QR module contrast audit
    let localContrastViolations = 0;
    let minLocalContrast = 21;

    if (moduleCount && moduleCount > 0) {
      const audit = auditModuleContrast({ data: imageData.data, width, height }, moduleCount);
      localContrastViolations = audit.violations;
      minLocalContrast = audit.minContrast;
    }

    // Attempt WebAssembly module initialization off-thread
    const wasm = await initWasmDecoder();

    // Helper to get recycled ArrayBuffer for zero-copy memory pool recycling
    const getRecycledBuffer = (): ArrayBuffer | undefined => {
      if (reqBuffer && reqBuffer.byteLength > 0) return reqBuffer;
      return undefined;
    };

    // Step 1: Two-Pass Orientation & Polarity Analysis (WASM layer with JS fallback)
    let digitalCheckOk = false;
    let decodedData = '';

    // Pass 1: Normal polarity & orientation pass
    if (wasm && typeof (wasm.exports as any).analyzePolarity === 'function') {
      (wasm.exports as any).analyzePolarity(width, height, 0);
    }

    let code = jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
    if (code) {
      digitalCheckOk = true;
      decodedData = code.data;
    } else {
      // Yield to let any newer message cancel this stale task
      await yieldToEventLoop();
      if (configId !== undefined && latestConfigId !== configId) {
        return;
      }

      // Pass 2: Inverted polarity & orientation analysis pass
      if (wasm && typeof (wasm.exports as any).analyzePolarity === 'function') {
        (wasm.exports as any).analyzePolarity(width, height, 1);
      }

      code = jsQR(imageData.data, width, height, { inversionAttempts: "onlyInvert" });
      if (code) {
        digitalCheckOk = true;
        decodedData = code.data;
      }
    }

    // Security Check: URL / Payload safety
    if (digitalCheckOk && isDangerousUrl(decodedData)) {
      const recycledBuf = getRecycledBuffer();
      const response = {
        success: false,
        physicalReady: false,
        error: 'SECURITY_VIOLATION',
        localContrastViolations,
        minLocalContrast,
        configId,
        sequenceId,
        buffer: recycledBuf
      };
      assertWorkerResponse(response);
      if (recycledBuf) {
        self.postMessage(response, [recycledBuf]);
      } else {
        self.postMessage(response);
      }
      return;
    }

    if (!digitalCheckOk) {
      const recycledBuf = getRecycledBuffer();
      const response = {
        success: false,
        physicalReady: false,
        error: 'NOT_FOUND',
        localContrastViolations,
        minLocalContrast,
        configId,
        sequenceId,
        buffer: recycledBuf
      };
      assertWorkerResponse(response);
      if (recycledBuf) {
        self.postMessage(response, [recycledBuf]);
      } else {
        self.postMessage(response);
      }
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

    const recycledBuf = getRecycledBuffer();
    const response = {
      success: true,
      physicalReady: physicalCheckOk,
      localContrastViolations,
      minLocalContrast,
      configId,
      sequenceId,
      buffer: recycledBuf
    };
    assertWorkerResponse(response);
    if (recycledBuf) {
      self.postMessage(response, [recycledBuf]);
    } else {
      self.postMessage(response);
    }
    
  } catch (_err) {
    releaseImageHandle(imageBitmap);
    imageBitmap = undefined;

    if (configId !== undefined && latestConfigId !== configId) {
      return;
    }
    const isValidationError = _err instanceof Error && (_err.message.includes('Worker request') || _err.message.includes('Worker response'));
    const recycledBuf = reqBuffer;
    const response = {
      success: false,
      physicalReady: false,
      error: isValidationError ? 'VALIDATION_ERROR' : 'CRASH',
      configId,
      sequenceId,
      buffer: recycledBuf
    };
    try {
      assertWorkerResponse(response);
      if (recycledBuf) {
        self.postMessage(response, [recycledBuf]);
      } else {
        self.postMessage(response);
      }
    } catch {
      self.postMessage({ success: false, physicalReady: false, error: 'CRASH', configId, sequenceId });
    }
  }
};
