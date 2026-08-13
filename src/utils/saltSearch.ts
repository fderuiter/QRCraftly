import QRCode from 'qrcode';
import { QRConfig, QRModules } from '../types';
import { isMazeSolvable, appendSaltToUrl } from './mazeHelpers';
import { performScannabilityCheck } from './scannabilityChecker';
import { drawQRInternal } from './qrRenderer';

export interface SaltSearchResult {
  config: QRConfig;
  modules: QRModules;
  salt: number | null;
}

/**
 * Executes the Payload-Permutation Salt Search on the main thread (or synchronous environment).
 * Yields periodically to maintain 60 FPS UI responsiveness and allows cancellation.
 */
export async function performSaltSearch(
  config: QRConfig,
  entry?: { r: number; c: number },
  exit?: { r: number; c: number },
  timeoutMs: number = 2000,
  shouldCancel?: () => boolean
): Promise<SaltSearchResult> {
  const startTime = Date.now();
  let salt = 0;
  let found = false;
  let resultConfig = { ...config };
  let resultModules: any = null;

  const dummyData = QRCode.create(config.value, {
    errorCorrectionLevel: config.errorCorrectionLevel,
  });
  const size = dummyData.modules.size;

  const actualEntry = entry || { r: 0, c: size - 8 };
  const actualExit = exit || { r: size - 1, c: size - 8 };

  // Temporary canvas for main-thread scannability check
  const canvasSize = 256;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx = canvas.getContext('2d');
  }

  while (Date.now() - startTime < timeoutMs) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('CANCELLED');
    }

    // Yield control periodically to keep UI fluid (60 FPS / main-thread responsive)
    if (salt % 10 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    const saltedValue = appendSaltToUrl(config.value, salt);

    try {
      const qrData = QRCode.create(saltedValue, {
        errorCorrectionLevel: config.errorCorrectionLevel,
      });
      const currentSize = qrData.modules.size;
      const modules: QRModules = qrData.modules as unknown as QRModules;

      const solvable = isMazeSolvable(modules, actualEntry, actualExit);
      if (solvable) {
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvasSize, canvasSize);
          drawQRInternal(
            ctx,
            modules,
            { ...config, value: saltedValue },
            null,
            null,
            canvasSize,
            currentSize,
            true
          );
          const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
          const scanResult = performScannabilityCheck(
            imageData,
            canvasSize,
            canvasSize,
            true
          );

          if (scanResult.success && scanResult.physicalReady) {
            found = true;
            resultConfig.value = saltedValue;
            resultModules = qrData.modules;
            break;
          }
        } else {
          found = true;
          resultConfig.value = saltedValue;
          resultModules = qrData.modules;
          break;
        }
      }
    } catch {
      // Continue to next salt if qr creation fails
    }

    salt++;
  }

  if (!found) {
    const qrData = QRCode.create(config.value, {
      errorCorrectionLevel: config.errorCorrectionLevel,
    });
    resultModules = qrData.modules;
  }

  return {
    config: resultConfig,
    modules: resultModules,
    salt: found ? salt : null,
  };
}
