import jsQR from 'jsqr';

self.onmessage = (e: MessageEvent<{ imageData: ImageData; width: number; height: number; configId?: string }>) => {
  try {
    const { imageData, width, height, configId } = e.data;
    const code = jsQR(imageData.data, width, height, {
      inversionAttempts: "dontInvert", // try faster first
    });

    if (code) {
      self.postMessage({ success: true, configId });
    } else {
      // Try again with invert
      const codeInvert = jsQR(imageData.data, width, height, {
        inversionAttempts: "attemptBoth",
      });
      if (codeInvert) {
        self.postMessage({ success: true, configId });
      } else {
        self.postMessage({ success: false, error: 'NOT_FOUND', configId });
      }
    }
  } catch (err) {
    self.postMessage({ success: false, error: 'CRASH', configId: e.data.configId });
  }
};
