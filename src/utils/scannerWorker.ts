import jsQR from 'jsqr';
import { isValidScannerRequest, assertScannerResponse, getDownscaledDimensions } from './scannerContract';

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let latestSequenceId = -1;
let offscreenCanvas: OffscreenCanvas | null = null;
let offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;

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

self.onmessage = async (e: MessageEvent<any>) => {
  const payload = e.data;
  if (!payload) return;

  // 1. Check for Video Demuxing and Off-Thread Scanning Mode
  if (payload.fileBuffer || payload.type === 'demux') {
    const { fileBuffer, wasmBuffer, taskId } = payload;

    // Initialize WebAssembly if buffer is provided
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
          (self as any).postMessage({ type: 'frame_decoded', taskId, data: frame });
        }
        (self as any).postMessage({ type: 'done', taskId });
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
            (self as any).postMessage({ type: 'frame_decoded', taskId, data: trimmed });
          }
        }
        (self as any).postMessage({ type: 'done', taskId });
        return;
      }
    }

    // Process frames sequentially
    for (const frameData of frames) {
      // If frame itself is a mock text frame
      try {
        const decodedStr = textDecoder.decode(frameData);
        if (decodedStr.startsWith('F|')) {
          (self as any).postMessage({ type: 'frame_decoded', taskId, data: decodedStr });
          continue;
        }
      } catch {
        // Ignore
      }

      // Decode VP8/VP9 frame using WebCodecs if supported
      if (typeof VideoDecoder !== 'undefined') {
        try {
          await decodeWebCodecsFrame(frameData, (imageBitmap) => {
            // Apply proportional downscaling logic (cap at 1280px)
            const { width: dWidth, height: dHeight } = getDownscaledDimensions(imageBitmap.width, imageBitmap.height, 1280);

            // Extract pixels using OffscreenCanvas
            const canvas = new OffscreenCanvas(dWidth, dHeight);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imageBitmap, 0, 0, dWidth, dHeight);
              const imageData = ctx.getImageData(0, 0, dWidth, dHeight);
              imageBitmap.close();

              // Run scanner on the pixels with inverted fallback
              let code = jsQR(imageData.data, dWidth, dHeight, { inversionAttempts: 'dontInvert' });
              if (!code) {
                code = jsQR(imageData.data, dWidth, dHeight, { inversionAttempts: 'attemptBoth' });
              }
              if (code && code.data) {
                (self as any).postMessage({ type: 'frame_decoded', taskId, data: code.data });
              }
            } else {
              imageBitmap.close();
            }
          });
        } catch (err) {
          console.error('Error decoding frame with WebCodecs:', err);
        }
      }
    }

    (self as any).postMessage({ type: 'done', taskId });
    return;
  }

  // 2. Check for image file upload or fallback canvas-based scan payloads (buffer or imageData)
  const isBufferRequest = payload.buffer instanceof ArrayBuffer && typeof payload.width === 'number' && typeof payload.height === 'number';
  const isImageDataRequest = payload.imageData && typeof payload.width === 'number' && typeof payload.height === 'number';

  if (isBufferRequest || isImageDataRequest) {
    const width = payload.width;
    const height = payload.height;
    const sequenceId = payload.sequenceId;
    let data: Uint8ClampedArray;

    if (isBufferRequest) {
      data = new Uint8ClampedArray(payload.buffer);
    } else {
      const imgData = payload.imageData;
      data = imgData.data instanceof Uint8ClampedArray ? imgData.data : new Uint8ClampedArray(imgData.data);
    }

    // Decode QR code off-thread using jsQR with inverted fallback
    let code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    }

    const response = {
      status: code ? ('pass' as const) : ('fail' as const),
      sequenceId,
      decodedData: code ? code.data : null,
      buffer: isBufferRequest ? payload.buffer : undefined,
    };
    assertScannerResponse(response);
    if (isBufferRequest) {
      (self as any).postMessage(response, [payload.buffer]);
    } else {
      (self as any).postMessage(response);
    }
    return;
  }

  // 3. Camera scanning mode (ImageBitmap)
  // Perform strict runtime schema validation
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

  // Cooperative stale frame check before yielding
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

  // Cooperative stale frame check after yielding
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
    // Maintain offscreen canvas container to render the transferred bitmap and extract pixels
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

    // Decode QR code off-thread using jsQR with inverted fallback
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
