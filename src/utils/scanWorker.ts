import jsQR from 'jsqr';

self.onmessage = (e) => {
  const { data, width, height, type } = e.data;
  if (type === 'SCAN') {
    try {
      // jsQR requires Uint8ClampedArray. The structured clone from postMessage preserves this.
      const code = jsQR(data, width, height);
      if (code) {
        self.postMessage({ type: 'SCAN_RESULT', scannable: true });
      } else {
        self.postMessage({ type: 'SCAN_RESULT', scannable: false });
      }
    } catch (err) {
      self.postMessage({ type: 'SCAN_ERROR', error: err });
    }
  }
};
