import jsQR from 'jsqr';
import { isValidScannerRequest, assertScannerResponse } from './scannerContract';

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let latestSequenceId = -1;
let offscreenCanvas: OffscreenCanvas | null = null;
let offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (e: MessageEvent<any>) => {
  const payload = e.data;

  // 1. Perform strict runtime schema validation
  if (!isValidScannerRequest(payload)) {
    const hasImage = payload && payload.image instanceof ImageBitmap;
    if (hasImage) {
      try {
        payload.image.close();
      } catch (err) {
        console.error('Failed to close image in validation fail:', err);
      }
    }
    const response = {
      status: 'fail' as const,
      sequenceId: (payload && typeof payload.sequenceId === 'number') ? payload.sequenceId : -1,
      error: 'INVALID_REQUEST_PAYLOAD',
    };
    try {
      assertScannerResponse(response);
    } catch (validationErr: any) {
      console.error('Validation error on emergency payload:', validationErr);
    }
    (self as any).postMessage(response);
    return;
  }

  const { image, width, height, sequenceId } = payload;

  // 2. Cooperative stale frame check before yielding
  if (sequenceId < latestSequenceId) {
    try {
      image.close();
    } catch (err) {
      console.error('Failed to close stale image:', err);
    }
    const response = {
      status: 'fail' as const,
      sequenceId,
      error: 'STALE_FRAME',
    };
    assertScannerResponse(response);
    (self as any).postMessage(response);
    return;
  }
  latestSequenceId = sequenceId;

  // Cooperative yielding to remain responsive and allow canceling/stale handling
  await yieldToEventLoop();

  // 3. Cooperative stale frame check after yielding
  if (sequenceId < latestSequenceId) {
    try {
      image.close();
    } catch (err) {
      console.error('Failed to close stale image after yield:', err);
    }
    const response = {
      status: 'fail' as const,
      sequenceId,
      error: 'STALE_FRAME',
    };
    assertScannerResponse(response);
    (self as any).postMessage(response);
    return;
  }

  try {
    // 4. Maintain offscreen canvas container to render the transferred bitmap and extract pixels
    if (!offscreenCanvas) {
      offscreenCanvas = new OffscreenCanvas(width, height);
      offscreenCtx = offscreenCanvas.getContext('2d');
    } else if (offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      offscreenCtx = offscreenCanvas.getContext('2d');
    }

    if (!offscreenCtx) {
      throw new Error('OFFSCREEN_CONTEXT_UNAVAILABLE');
    }

    // Render image and extract pixels
    offscreenCtx.drawImage(image, 0, 0, width, height);
    const imageData = offscreenCtx.getImageData(0, 0, width, height);

    // Explicitly close the transferred bitmap immediately after decoding/extraction to prevent memory leaks
    try {
      image.close();
    } catch (err) {
      console.error('Failed to close image after drawing:', err);
    }

    // Decode QR code off-thread using jsQR
    let code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
    }

    const response = {
      status: code ? ('pass' as const) : ('fail' as const),
      sequenceId,
      decodedData: code ? code.data : null,
    };
    assertScannerResponse(response);
    (self as any).postMessage(response);
  } catch (error: any) {
    // Ensure image is closed even on error
    try {
      image.close();
    } catch {
      // Ignored
    }
    const response = {
      status: 'fail' as const,
      sequenceId,
      error: error?.message || 'DECODE_ERROR',
    };
    assertScannerResponse(response);
    (self as any).postMessage(response);
  }
};
