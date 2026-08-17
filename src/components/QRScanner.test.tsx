// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QRScanner } from './QRScanner';
import { useCamera } from '../hooks/useCamera';
import { useAdaptiveScanner } from '../hooks/useAdaptiveScanner';
import jsQR from 'jsqr';

// Mock hooks and external libraries
vi.mock('../hooks/useCamera', () => ({
  useCamera: vi.fn(),
}));

vi.mock('../hooks/useAdaptiveScanner', () => ({
  useAdaptiveScanner: vi.fn(),
}));

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

describe('QRScanner Component', () => {
  const mockOnScanSuccess = vi.fn();
  const mockOnClose = vi.fn();
  const mockStartStream = vi.fn();
  const mockStopStream = vi.fn();
  const mockStartScanning = vi.fn();
  const mockStopScanning = vi.fn();
  let originalImage: any;

  beforeEach(() => {
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
    originalImage = global.Image;
    global.Image = class {
      onload: any = null;
      onerror: any = null;
      _src: string = '';
      width = 100;
      height = 100;
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
      get src() {
        return this._src;
      }
    } as any;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(4),
        width: 100,
        height: 100,
      }),
    } as any);

    vi.mocked(useCamera).mockReturnValue({
      permissionState: 'prompt',
      stream: null,
      error: null,
      isInitializing: false,
      startStream: mockStartStream,
      stopStream: mockStopStream,
    });

    vi.mocked(useAdaptiveScanner).mockReturnValue({
      isScanning: false,
      status: 'idle',
      samplingDelay: 33,
      latencyHistory: [],
      startScanning: mockStartScanning,
      stopScanning: mockStopScanning,
    });

    mockStartStream.mockResolvedValue({ getTracks: () => [] } as any);
  });

  afterEach(() => {
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
    global.Image = originalImage;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renders webcam view by default and starts camera stream', async () => {
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(screen.getByRole('button', { name: /webcam/i })).toHaveClass('bg-white');
    expect(mockStartStream).toHaveBeenCalled();
  });

  it('renders troubleshooting card immediately upon camera permission denial', async () => {
    vi.mocked(useCamera).mockReturnValue({
      permissionState: 'denied',
      stream: null,
      error: new Error('Permission denied'),
      isInitializing: false,
      startStream: mockStartStream,
      stopStream: mockStopStream,
    });

    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(screen.getByText('Camera Access Denied')).toBeInTheDocument();
    // Troubleshooting card should have specific instructions
    expect(screen.getByText(/Open iOS Settings|Open Android Settings|Open macOS System Settings|Open Windows Settings|Click the padlock/)).toBeInTheDocument();
    
    // Switch to File Mode button is present
    const switchBtn = screen.getByRole('button', { name: /switch to file mode/i });
    expect(switchBtn).toBeInTheDocument();

    // Clicking switches the mode to file
    fireEvent.click(switchBtn);
    expect(screen.getByText(/drag & drop qr image/i)).toBeInTheDocument();
  });

  it('allows switching to file upload mode via the tab and processes images', async () => {
    // Intercept scanner worker and mock successful response
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      setTimeout(() => {
        worker.dispatchMessage({
          status: 'pass',
          sequenceId: msg.sequenceId,
          decodedData: 'https://qrcraftly.com',
          buffer: msg.buffer || new ArrayBuffer(0),
        });
      }, 0);
    });

    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    const fileTab = screen.getByRole('button', { name: /file upload/i });
    fireEvent.click(fileTab);

    expect(screen.getByText(/drag & drop qr image or video/i)).toBeInTheDocument();

    // Mock successful jsQR decoding
    vi.mocked(jsQR).mockReturnValue({ data: 'https://qrcraftly.com' } as any);

    // Mock FileReader and Image loading
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

    // Trigger file change
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalledWith('https://qrcraftly.com');
    });
  });

  it('handles image decoding failures cleanly and displays an error message', async () => {
    // Intercept scanner worker and mock fail response
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      setTimeout(() => {
        worker.dispatchMessage({
          status: 'fail',
          sequenceId: msg.sequenceId,
          buffer: msg.buffer || new ArrayBuffer(0),
        });
      }, 0);
    });

    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    const fileTab = screen.getByRole('button', { name: /file upload/i });
    fireEvent.click(fileTab);

    // Mock jsQR returning null (no QR code found)
    vi.mocked(jsQR).mockReturnValue(null);

    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/no qr code detected in this image/i)).toBeInTheDocument();
    });
  });

  it('resets the file input value immediately, allows consecutive uploads of the same file, displays spinner, and updates error states', async () => {
    // Set up a worker interceptor to sequentially simulate successful, failed, and successful uploads
    let uploadIndex = 0;
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      setTimeout(() => {
        if (msg.sequenceId === 1) {
          uploadIndex++;
        }
        if (uploadIndex === 1) {
          worker.dispatchMessage({
            status: 'pass',
            sequenceId: msg.sequenceId,
            decodedData: 'scan 1',
            buffer: msg.buffer || new ArrayBuffer(0),
          });
        } else if (uploadIndex === 2) {
          worker.dispatchMessage({
            status: 'fail',
            sequenceId: msg.sequenceId,
            buffer: msg.buffer || new ArrayBuffer(0),
          });
        } else {
          worker.dispatchMessage({
            status: 'pass',
            sequenceId: msg.sequenceId,
            decodedData: 'scan 2',
            buffer: msg.buffer || new ArrayBuffer(0),
          });
        }
      }, 0);
    });

    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    const fileTab = screen.getByRole('button', { name: /file upload/i });
    fireEvent.click(fileTab);

    // Mock first upload as successful, second as failure, and third as success
    let callCount = 0;
    vi.mocked(jsQR).mockImplementation((data, width, height, options) => {
      if (!options || options.inversionAttempts === 'dontInvert') {
        callCount++;
      }
      if (callCount === 1) return { data: 'scan 1' } as any;
      if (callCount === 2 || callCount === 3) return null;
      return { data: 'scan 2' } as any;
    });

    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload qr code image or video file/i) as HTMLInputElement;

    // First upload
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // 1. Selecting any file immediately resets the native value of the hidden file input element.
    expect(fileInput.value).toBe('');

    // Ensure the processing loader spinner is visible initially
    expect(screen.getByText(/processing file\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalledWith('scan 1');
    });

    // Second consecutive upload of the exact same file
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // 2. Clear native value immediately again
    expect(fileInput.value).toBe('');

    // 3. The loading state spinner appears on the second consecutive upload of the same file.
    expect(screen.getByText(/processing file\.\.\./i)).toBeInTheDocument();

    // 4. The error notification container updates correctly if the second upload fails again.
    await waitFor(() => {
      expect(screen.getByText(/no qr code detected in this image/i)).toBeInTheDocument();
    });

    // Third consecutive upload of the exact same file
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    expect(fileInput.value).toBe('');
    expect(screen.getByText(/processing file\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalledWith('scan 2');
    });

    // Reset jsQR mock implementation
    vi.mocked(jsQR).mockReset();
  });

  describe('WebM & MKV Video Importing and Decoding', () => {
    let originalCanPlayType: any;
    let originalURL: any;
    let originalFetch: any;
    let originalWorker: any;

    beforeEach(() => {
      originalCanPlayType = HTMLVideoElement.prototype.canPlayType;
      originalURL = global.URL;
      originalFetch = global.fetch;
      originalWorker = global.Worker;

      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:dummy');
      global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      HTMLVideoElement.prototype.canPlayType = originalCanPlayType;
      global.URL = originalURL;
      global.fetch = originalFetch;
      global.Worker = originalWorker;
    });

    it('uses native decoding when WebM container is natively supported', async () => {
      // Mock native support
      HTMLVideoElement.prototype.canPlayType = vi.fn().mockReturnValue('probably');

      let mockVideoInstance: any = null;
      let currentTimeVal = 0;
      const originalCreateElement = document.createElement;
      vi.spyOn(document, 'createElement').mockImplementation(function(this: any, tagName, options) {
        const el = originalCreateElement.call(this || document, tagName, options);
        if (tagName === 'video') {
          Object.defineProperties(el, {
            videoWidth: { get: () => 640, configurable: true },
            videoHeight: { get: () => 480, configurable: true },
            duration: { get: () => 1.0, configurable: true },
            currentTime: { get: () => currentTimeVal, set: (val) => { currentTimeVal = val; }, configurable: true },
          });
          mockVideoInstance = el;
        }
        return el;
      });

      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

      const fileTab = screen.getByRole('button', { name: /file upload/i });
      fireEvent.click(fileTab);

      // Mock successful jsQR decoding
      vi.mocked(jsQR).mockReturnValue({ data: 'F|0|1|native' } as any);

      const mockFile = new File(['dummy video data'], 'test.webm', { type: 'video/webm' });
      mockFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(41));
      const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

      // Trigger file change
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Simulate video metadata load and seeking
      setTimeout(() => {
        if (mockVideoInstance && mockVideoInstance.onloadedmetadata) {
          mockVideoInstance.onloadedmetadata();
        }
      }, 10);

      setTimeout(() => {
        if (mockVideoInstance && mockVideoInstance.onseeked) {
          mockVideoInstance.onseeked();
        }
      }, 50);

      // Seek beyond duration to end video frame extraction
      setTimeout(() => {
        if (mockVideoInstance) {
          mockVideoInstance.currentTime = 2.0;
          if (mockVideoInstance.onseeked) {
            mockVideoInstance.onseeked();
          }
        }
      }, 100);

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith('F|0|1|native');
      });
    });

    it('disposes of all memory resources including event handlers, scheduler, double buffers, and revokes URLs during cleanup', async () => {
      // Mock native support
      HTMLVideoElement.prototype.canPlayType = vi.fn().mockReturnValue('probably');

      let mockVideoInstance: any = null;
      let currentTimeVal = 0;
      const originalCreateElement = document.createElement;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      const mockRevokeObjectURL = vi.fn();
      URL.revokeObjectURL = mockRevokeObjectURL;

      vi.spyOn(document, 'createElement').mockImplementation(function(this: any, tagName, options) {
        const el = originalCreateElement.call(this || document, tagName, options);
        if (tagName === 'video') {
          Object.defineProperties(el, {
            videoWidth: { get: () => 640, configurable: true },
            videoHeight: { get: () => 480, configurable: true },
            duration: { get: () => 1.0, configurable: true },
            currentTime: { get: () => currentTimeVal, set: (val) => { currentTimeVal = val; }, configurable: true },
          });
          mockVideoInstance = el;
        }
        return el;
      });

      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

      const fileTab = screen.getByRole('button', { name: /file upload/i });
      fireEvent.click(fileTab);

      // Mock successful jsQR decoding
      vi.mocked(jsQR).mockReturnValue({ data: 'F|0|1|disposed' } as any);

      const mockFile = new File(['dummy video data for disposal'], 'test.webm', { type: 'video/webm' });
      mockFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(41));
      const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

      // Trigger file change
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Simulate video metadata load and seeking
      await waitFor(() => {
        expect(mockVideoInstance).not.toBeNull();
      });

      // At this point, metadata is loaded
      if (mockVideoInstance && mockVideoInstance.onloadedmetadata) {
        await act(async () => {
          mockVideoInstance.onloadedmetadata();
        });
      }

      // Check event handlers are registered
      expect(mockVideoInstance.onseeked).toBeDefined();
      expect(mockVideoInstance.onerror).toBeDefined();

      // Trigger seeked which decodes and triggers scan success, which immediately triggers cleanup
      if (mockVideoInstance && mockVideoInstance.onseeked) {
        await act(async () => {
          await mockVideoInstance.onseeked();
        });
      }

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith('F|0|1|disposed');
      });

      // Check event handlers are set to null (Requirement 1)
      expect(mockVideoInstance.onloadedmetadata).toBeNull();
      expect(mockVideoInstance.onseeked).toBeNull();
      expect(mockVideoInstance.onerror).toBeNull();

      // Check that the object URL was revoked (Requirement 4)
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Restore
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.createElement = originalCreateElement;
    });

    it('triggers WebAssembly on-demand download and Web Worker demuxing on unsupported systems (e.g. Safari / MKV)', async () => {
      // Mock lack of native support
      HTMLVideoElement.prototype.canPlayType = vi.fn().mockReturnValue('');

      // Mock fetch to simulate downloading WASM on-demand
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(41)),
      });
      global.fetch = mockFetch;

      // Mock Worker
      const mockPostMessage = vi.fn();
      const mockWorkerInstance = {
        postMessage: mockPostMessage,
        onmessage: null as any,
        onerror: null as any,
        terminate: vi.fn(),
      };
      global.Worker = vi.fn().mockImplementation(function() {
        return mockWorkerInstance;
      }) as any;

      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

      const fileTab = screen.getByRole('button', { name: /file upload/i });
      fireEvent.click(fileTab);

      const mockFile = new File(['dummy binary video data'], 'test.mkv', { type: 'video/x-matroska' });
      mockFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(41));
      const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

      // Trigger file change
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Verify that WebAssembly assets are fetched on-demand
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/webm-demuxer.wasm');
      });

      // Verify Web Worker creation and initialization with zero-copy transferred buffers
      await waitFor(() => {
        expect(global.Worker).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalled();
      });

      // Simulate worker decoding frame chunks and finishing
      setTimeout(() => {
        if (mockWorkerInstance.onmessage) {
          mockWorkerInstance.onmessage({ data: { type: 'frame_decoded', data: 'F|0|1|wasm' } });
        }
      }, 10);

      setTimeout(() => {
        if (mockWorkerInstance.onmessage) {
          mockWorkerInstance.onmessage({ data: { type: 'done' } });
        }
      }, 50);

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith('F|0|1|wasm');
      });
    });
  });
});
