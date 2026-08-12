import jsQR from 'jsqr';

const workerSelf: any = self;

self.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer; width: number; height: number }>) => {
  const { buffer, width, height } = e.data;
  try {
    const data = new Uint8ClampedArray(buffer);

    // Decode QR code off-thread using jsQR
    let code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    }

    if (code && code.data) {
      workerSelf.postMessage({ success: true, data: code.data });
    } else {
      workerSelf.postMessage({ success: false, error: 'No QR code detected in this image. Try a clearer or higher-contrast QR code image.' });
    }
  } catch (err: any) {
    workerSelf.postMessage({ success: false, error: err?.message || 'Decode error' });
  }
};
