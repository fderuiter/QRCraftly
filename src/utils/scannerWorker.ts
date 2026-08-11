import jsQR from 'jsqr';
import { isValidScannerRequest, assertScannerResponse } from './scannerContract';

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let latestSequenceId = -1;

self.onmessage = async (e: MessageEvent<any>) => {
  const payload = e.data;

  // 1. Perform strict runtime schema validation
  if (!isValidScannerRequest(payload)) {
    const hasBuffer = payload && payload.buffer instanceof ArrayBuffer;
    const transferList = hasBuffer ? [payload.buffer] : [];
    const response = {
      status: 'fail' as const,
      sequenceId: (payload && typeof payload.sequenceId === 'number') ? payload.sequenceId : -1,
      error: 'INVALID_REQUEST_PAYLOAD',
      buffer: hasBuffer ? payload.buffer : new ArrayBuffer(0),
    };
    try {
      assertScannerResponse(response);
    } catch (validationErr: any) {
      // Emergency fallback in case validation of emergency payload fails
      console.error('Validation error on emergency payload:', validationErr);
    }
    (self as any).postMessage(response, transferList);
    return;
  }

  const { buffer, width, height, sequenceId } = payload;

  // 2. Cooperative stale frame check before yielding
  if (sequenceId < latestSequenceId) {
    const response = {
      status: 'fail' as const,
      sequenceId,
      error: 'STALE_FRAME',
      buffer,
    };
    assertScannerResponse(response);
    (self as any).postMessage(response, [buffer]);
    return;
  }
  latestSequenceId = sequenceId;

  // Cooperative yielding to remain responsive and allow canceling/stale handling
  await yieldToEventLoop();

  // 3. Cooperative stale frame check after yielding
  if (sequenceId < latestSequenceId) {
    const response = {
      status: 'fail' as const,
      sequenceId,
      error: 'STALE_FRAME',
      buffer,
    };
    assertScannerResponse(response);
    (self as any).postMessage(response, [buffer]);
    return;
  }

  try {
    // Wrap the transferred ArrayBuffer in a Uint8ClampedArray for jsQR
    const data = new Uint8ClampedArray(buffer);

    // Decode QR code off-thread using jsQR
    let code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    }

    const response = {
      status: code ? ('pass' as const) : ('fail' as const),
      sequenceId,
      decodedData: code ? code.data : null,
      buffer,
    };
    assertScannerResponse(response);
    (self as any).postMessage(response, [buffer]);
  } catch (error: any) {
    const response = {
      status: 'fail' as const,
      sequenceId,
      error: error?.message || 'DECODE_ERROR',
      buffer,
    };
    assertScannerResponse(response);
    (self as any).postMessage(response, [buffer]);
  }
};
