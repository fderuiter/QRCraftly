import jsQR from 'jsqr';

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

self.onmessage = async (e: MessageEvent<any>) => {
  const { imageData, width, height, sequenceId } = e.data;

  // Cooperative yielding to remain responsive and allow canceling/stale handling
  await yieldToEventLoop();

  try {
    if (!imageData || !imageData.data) {
      self.postMessage({
        status: 'fail',
        sequenceId,
        error: 'INVALID_IMAGE_DATA',
      });
      return;
    }

    const { data } = imageData;

    // Decode QR code off-thread using jsQR
    let code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    }

    if (code) {
      self.postMessage({
        status: 'pass',
        sequenceId,
        decodedData: code.data,
      });
    } else {
      self.postMessage({
        status: 'fail',
        sequenceId,
      });
    }
  } catch (error: any) {
    self.postMessage({
      status: 'fail',
      sequenceId,
      error: error?.message || 'DECODE_ERROR',
    });
  }
};
