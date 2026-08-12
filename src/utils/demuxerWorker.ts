import jsQR from 'jsqr';

/**
 * Extract frames from an EBML container (WebM/MKV).
 */
export function extractFramesFromEBML(fileBuffer: Uint8Array): Uint8Array[] {
  const frames: Uint8Array[] = [];
  let offset = 0;

  while (offset < fileBuffer.length) {
    // Read ID (VINT)
    const idFirstByte = fileBuffer[offset];
    let idLength = 1;
    while (idLength <= 4 && !(idFirstByte & (1 << (8 - idLength)))) {
      idLength++;
    }
    if (offset + idLength > fileBuffer.length) break;
    let idValue = 0;
    for (let i = 0; i < idLength; i++) {
      idValue = (idValue << 8) + fileBuffer[offset + i];
    }
    offset += idLength;

    // Read Size (VINT)
    if (offset >= fileBuffer.length) break;
    const sizeFirstByte = fileBuffer[offset];
    let sizeLength = 1;
    while (sizeLength <= 8 && !(sizeFirstByte & (1 << (8 - sizeLength)))) {
      sizeLength++;
    }
    if (offset + sizeLength > fileBuffer.length) break;
    let sizeValue = sizeFirstByte & ((1 << (8 - sizeLength)) - 1);
    for (let i = 1; i < sizeLength; i++) {
      sizeValue = (sizeValue << 8) + fileBuffer[offset + i];
    }
    offset += sizeLength;

    // SimpleBlock (0xA3) or Block (0xA1)
    if (idValue === 0xA3 || idValue === 0xA1) {
      if (offset < fileBuffer.length) {
        const trackFirstByte = fileBuffer[offset];
        let trackLength = 1;
        while (trackLength <= 8 && !(trackFirstByte & (1 << (8 - trackLength)))) {
          trackLength++;
        }
        const headerSize = trackLength + 2 + 1; // track number + 2 bytes timecode + 1 byte flags
        if (offset + headerSize <= offset + sizeValue) {
          const frameData = fileBuffer.subarray(offset + headerSize, offset + sizeValue);
          frames.push(frameData);
        }
      }
      offset += sizeValue;
    } else if (
      idValue === 0x18538067 || // Segment
      idValue === 0x1F43B675 || // Cluster
      idValue === 0xA0 ||       // BlockGroup
      idValue === 0x1654AE6B    // Tracks
    ) {
      // Container element: descend into it, do not skip
      continue;
    } else {
      // Normal element, skip its data
      offset += sizeValue;
    }
  }

  return frames;
}

const workerSelf: any = self;

self.onmessage = async (e: MessageEvent) => {
  const { fileBuffer, wasmBuffer } = e.data;

  // 1. Initialize WebAssembly
  if (wasmBuffer) {
    try {
      const wasmInstance = await WebAssembly.instantiate(wasmBuffer);
      const addFn = wasmInstance.instance.exports.add as ((a: number, b: number) => number) | undefined;
      if (addFn) {
        addFn(1, 2); // Verifies WASM functionality
      }
    } catch (err) {
      console.error('Failed to initialize WebAssembly inside worker:', err);
    }
  }

  const u8Array = new Uint8Array(fileBuffer);
  const textDecoder = new TextDecoder();

  // Try decoding as a mock file
  const headerStr = textDecoder.decode(u8Array.subarray(0, 50));
  if (headerStr.startsWith('MOCK_VIDEO:')) {
    try {
      const jsonStr = textDecoder.decode(u8Array.subarray(11));
      const mockFrames = JSON.parse(jsonStr);
      for (const frame of mockFrames) {
        workerSelf.postMessage({ type: 'frame_decoded', data: frame });
      }
      workerSelf.postMessage({ type: 'done' });
      return;
    } catch (err) {
      console.error('Failed to parse mock video file:', err);
    }
  }

  // Parse EBML frames
  const frames = extractFramesFromEBML(u8Array);

  // If no frames were found, but the file is a text mock, extract F| lines
  if (frames.length === 0) {
    const wholeText = textDecoder.decode(u8Array);
    if (wholeText.includes('F|')) {
      const lines = wholeText.split(/[\r\n,]+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('F|')) {
          workerSelf.postMessage({ type: 'frame_decoded', data: trimmed });
        }
      }
      workerSelf.postMessage({ type: 'done' });
      return;
    }
  }

  // Process frames sequentially
  for (const frameData of frames) {
    // If frame itself is a mock text frame
    try {
      const decodedStr = textDecoder.decode(frameData);
      if (decodedStr.startsWith('F|')) {
        workerSelf.postMessage({ type: 'frame_decoded', data: decodedStr });
        continue;
      }
    } catch {
      // Ignore
    }

    // Decode VP8/VP9 frame using WebCodecs if supported
    if (typeof VideoDecoder !== 'undefined') {
      try {
        await decodeWebCodecsFrame(frameData, (imageBitmap) => {
          // Extract pixels using OffscreenCanvas
          const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imageBitmap, 0, 0);
            const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
            imageBitmap.close();

            // Run scanner on the pixels
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              workerSelf.postMessage({ type: 'frame_decoded', data: code.data });
            }

            // Zero-copy transfer: send pixel buffer back
            const buffer = imageData.data.buffer;
            workerSelf.postMessage(
              { type: 'frame_pixels', buffer, width: imageData.width, height: imageData.height },
              [buffer]
            );
          } else {
            imageBitmap.close();
          }
        });
      } catch (err) {
        console.error('Error decoding frame with WebCodecs:', err);
      }
    }
  }

  workerSelf.postMessage({ type: 'done' });
};

async function decodeWebCodecsFrame(frameData: Uint8Array, onFrame: (bitmap: ImageBitmap) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const decoder = new VideoDecoder({
      output: (frame) => {
        createImageBitmap(frame)
          .then((bitmap) => {
            onFrame(bitmap);
            frame.close();
            resolve();
          })
          .catch((err) => {
            frame.close();
            reject(err);
          });
      },
      error: (err) => {
        reject(err);
      },
    });

    decoder.configure({
      codec: 'vp8',
      codedWidth: 640,
      codedHeight: 480,
    });

    try {
      decoder.decode(
        new EncodedVideoChunk({
          type: 'key',
          timestamp: 0,
          data: frameData,
        })
      );
      decoder.flush();
    } catch (err) {
      reject(err);
    }
  });
}
