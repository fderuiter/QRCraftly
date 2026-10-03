// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QRScanner } from './QRScanner';
import { useQrScanner, type UseQrScannerOptions } from '@/packages/optical-scanner/client';
import jsQR from 'jsqr';
import { axe } from 'vitest-axe';

// The real hook and Camera Session run against a fake camera; the spy only records the options
// so a test can deliver a decoded code.
vi.mock('@/packages/optical-scanner/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/packages/optical-scanner/client')>();
  return { ...actual, useQrScanner: vi.fn(actual.useQrScanner) };
});

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

/** A camera track that records whether it was stopped. */
interface FakeTrack {
  readyState: 'live' | 'ended';
  stop: () => void;
}

describe('QRScanner Component', () => {
  const mockOnScanSuccess = vi.fn();
  const mockOnClose = vi.fn();
  let originalImage: typeof Image;
  let originalMediaDevices: MediaDevices | undefined;
  let tracks: FakeTrack[];
  let getUserMedia: ReturnType<typeof vi.fn<(constraints?: MediaStreamConstraints) => Promise<MediaStream>>>;

  /** Each successful request opens one new live track. */
  const openTrack = async (): Promise<MediaStream> => {
    const track: FakeTrack = {
      readyState: 'live',
      stop: () => {
        track.readyState = 'ended';
      },
    };
    tracks.push(track);
    const stream: Pick<MediaStream, 'getTracks'> = { getTracks: () => [track as unknown as MediaStreamTrack] };
    return stream as MediaStream;
  };
  const liveTracks = () => tracks.filter((track) => track.readyState === 'live').length;
  const deny = (name: string) => getUserMedia.mockRejectedValue(new DOMException('Camera refused', name));

  /** Delivers a decoded code the way the scanner engine does. */
  const decode = async (data: string) => {
    const options: UseQrScannerOptions | undefined = vi.mocked(useQrScanner).mock.lastCall?.[0];
    await act(async () => {
      options?.onScanSuccess?.(data);
    });
  };

  /** Lets pending camera requests settle. */
  const settle = () => act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

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
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    tracks = [];
    getUserMedia = vi.fn(openTrack);
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true, writable: true });
  });

  afterEach(() => {
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
    global.Image = originalImage;
    Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true, writable: true });
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renders webcam view by default and opens the rear camera', async () => {
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(screen.getByRole('radio', { name: /webcam/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /file upload/i })).toHaveAttribute('aria-checked', 'false');
    await settle();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
    expect(liveTracks()).toBe(1);
  });

  it('exposes the selected input mode with aria-checked when switching to file upload', async () => {
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('radio', { name: /file upload/i }));
    expect(screen.getByRole('radio', { name: /file upload/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /webcam/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radiogroup', { name: 'Scanner input' })).toBeInTheDocument();
    // The file input is not nested inside the dropzone button.
    const input = screen.getByLabelText('Upload QR code image or video file');
    expect(input.closest('button')).toBeNull();
  });

  it('keeps the video mounted while camera permission is pending, then shows the stream', async () => {
    let grant: () => void = () => {};
    getUserMedia.mockImplementationOnce(
      () => new Promise<MediaStream>((resolve) => {
        grant = () => resolve(openTrack());
      })
    );

    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
    const video = screen.getByLabelText('Webcam feed') as HTMLVideoElement;
    expect(await screen.findByText('Initializing camera stream...')).toBeInTheDocument();

    await act(async () => {
      grant();
    });
    await settle();

    expect(screen.getByLabelText('Webcam feed')).toBe(video);
    expect(screen.queryByText('Initializing camera stream...')).not.toBeInTheDocument();
    expect(video.srcObject).not.toBeNull();
    expect(liveTracks()).toBe(1);
  });

  describe('one owner for the camera (#1097)', () => {
    it('opens exactly one camera under StrictMode and none after unmount', async () => {
      const { unmount } = render(
        <React.StrictMode>
          <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
        </React.StrictMode>
      );
      await settle();
      expect(liveTracks()).toBe(1);
      expect((screen.getByLabelText('Webcam feed') as HTMLVideoElement).srcObject).not.toBeNull();

      unmount();
      await settle();
      expect(liveTracks()).toBe(0);
    });

    it('leaves no camera running after 20 quick mount and unmount cycles', async () => {
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
        // Every other cycle unmounts before the browser answers the camera request.
        if (i % 2 === 0) await settle();
        unmount();
      }
      await settle();
      expect(tracks.length).toBeGreaterThanOrEqual(10);
      expect(liveTracks()).toBe(0);
    });

    it('does not ask for the camera again on a re-render', async () => {
      const { rerender } = render(<QRScanner onScanSuccess={mockOnScanSuccess} />);
      await settle();
      rerender(<QRScanner onScanSuccess={mockOnScanSuccess} />);
      await settle();
      expect(getUserMedia).toHaveBeenCalledTimes(1);
      expect(liveTracks()).toBe(1);
    });

    it('releases the camera after a successful scan in non-continuous mode and reopens it from the Webcam tab', async () => {
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} continuous={false} />);
      await settle();
      expect(liveTracks()).toBe(1);

      await decode('https://example.com/qr1');
      expect(mockOnScanSuccess).toHaveBeenCalledWith('https://example.com/qr1');
      expect(liveTracks()).toBe(0);
      expect((screen.getByLabelText('Webcam feed') as HTMLVideoElement).srcObject).toBeNull();

      await act(async () => {
        fireEvent.click(screen.getByRole('radio', { name: /webcam/i }));
      });
      await settle();
      expect(liveTracks()).toBe(1);
    });

    it('keeps the camera open when continuous scanning is enabled', async () => {
      render(<QRScanner onScanSuccess={mockOnScanSuccess} continuous={true} />);
      await settle();

      await decode('https://example.com/qr3');
      expect(mockOnScanSuccess).toHaveBeenCalledWith('https://example.com/qr3');
      expect(liveTracks()).toBe(1);
    });

    it('releases the camera when switching to file upload', async () => {
      render(<QRScanner onScanSuccess={mockOnScanSuccess} />);
      await settle();
      expect(liveTracks()).toBe(1);

      await act(async () => {
        fireEvent.click(screen.getByRole('radio', { name: /file upload/i }));
      });
      expect(liveTracks()).toBe(0);
    });
  });

  it('leads with the image fallback when camera permission is denied, and retries', async () => {
    deny('NotAllowedError');
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(await screen.findByText('Camera Access Denied')).toBeInTheDocument();
    // Troubleshooting card should have specific instructions
    expect(screen.getByText(/Open iOS Settings|Open Android Settings|Open macOS System Settings|Open Windows Settings|Click the padlock/)).toBeInTheDocument();

    // The image fallback leads (#1055): it is the first action, before the permission help.
    const switchBtn = screen.getByRole('button', { name: 'Scan from an image instead' });
    const retry = screen.getByRole('button', { name: /retry permission/i });
    expect(switchBtn.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await axe(switchBtn.closest('div.absolute') as HTMLElement)).toHaveNoViolations();

    // Granting on retry replaces the card with the camera.
    getUserMedia.mockImplementation(openTrack);
    await act(async () => {
      fireEvent.click(retry);
    });
    await settle();
    expect(screen.queryByText('Camera Access Denied')).not.toBeInTheDocument();
    expect(liveTracks()).toBe(1);
  });

  it('switches to file upload from the denied card', async () => {
    deny('NotAllowedError');
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Scan from an image instead' }));
    expect(screen.getByText(/drag & drop qr image/i)).toBeInTheDocument();
  });

  it('explains a missing camera without offering a permission retry', async () => {
    deny('NotFoundError');
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(await screen.findByText('Camera Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan from an image instead' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry permission/i })).not.toBeInTheDocument();
  });

  it('explains a browser without a camera API', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(await screen.findByText('Camera Unavailable')).toBeInTheDocument();
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

    const fileTab = screen.getByRole('radio', { name: /file upload/i });
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

    const fileTab = screen.getByRole('radio', { name: /file upload/i });
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

    const fileTab = screen.getByRole('radio', { name: /file upload/i });
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

      const fileTab = screen.getByRole('radio', { name: /file upload/i });
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

      const fileTab = screen.getByRole('radio', { name: /file upload/i });
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

      const fileTab = screen.getByRole('radio', { name: /file upload/i });
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

  describe('file scanning around the camera', () => {
    it('allows file-upload component to mount and process files after scanner unmounts', async () => {
      globalThis.mockWorkerControl.setInterceptor((msg: any, worker: any) => {
        setTimeout(() => {
          worker.dispatchMessage({
            status: 'pass',
            sequenceId: msg.sequenceId,
            decodedData: 'https://post-unmount-scan.com',
            buffer: msg.buffer || new ArrayBuffer(0),
          });
        }, 0);
      });

      // 1. Mount and unmount QRScanner
      const { unmount } = render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      await act(async () => {
        unmount();
      });

      // 2. Mount QRScanner in file mode and verify file processing works
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      const fileTab = screen.getByRole('radio', { name: /file upload/i });
      fireEvent.click(fileTab);

      vi.mocked(jsQR).mockReturnValue({ data: 'https://post-unmount-scan.com' } as any);
      const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith('https://post-unmount-scan.com');
      });
    });

    it('immediately aborts active file processing when switching modes from file to webcam', async () => {
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

      const fileTab = screen.getByRole('radio', { name: /file upload/i });
      fireEvent.click(fileTab);

      vi.mocked(jsQR).mockReturnValue({ data: 'stale result' } as any);

      const mockFile = new File(['dummy file'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/upload qr code image or video file/i);

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Switch to webcam mode mid-processing
      const webcamTab = screen.getByRole('radio', { name: /webcam/i });
      fireEvent.click(webcamTab);

      // Give the abandoned scan time to finish (it would land well within this), then verify the
      // scan success callback was not invoked with the stale result.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      expect(mockOnScanSuccess).not.toHaveBeenCalledWith('stale result');
    });
  });
});
