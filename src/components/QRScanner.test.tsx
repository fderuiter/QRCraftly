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
      options?.onScanSuccess?.(data, { text: data, bytes: null, corners: null, source: 'jsqr', durationMs: 0 });
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
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
    expect(liveTracks()).toBe(1);
  });

  it('exposes the selected input mode with aria-checked when switching to file upload', async () => {
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('radio', { name: /file upload/i }));
    expect(screen.getByRole('radio', { name: /file upload/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /webcam/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radiogroup', { name: 'Scanner input' })).toBeInTheDocument();
    // The file input is not nested inside the dropzone button.
    const input = screen.getByLabelText('Upload QR code image file');
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

    expect(await screen.findByText('No Camera Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan from an image instead' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry permission/i })).not.toBeInTheDocument();
  });

  it('explains a browser without a camera API', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(await screen.findByText('No Camera Found')).toBeInTheDocument();
  });

  it('explains a camera in use by another app and retries it (#1100)', async () => {
    deny('NotReadableError');
    render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);

    expect(await screen.findByText('Camera In Use')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry permission/i })).not.toBeInTheDocument();
    getUserMedia.mockImplementation(openTrack);
    fireEvent.click(screen.getByRole('button', { name: 'Try the camera again' }));
    await settle();
    expect(screen.queryByText('Camera In Use')).not.toBeInTheDocument();
    expect(liveTracks()).toBe(1);
  });

  describe('camera controls (#1100)', () => {
    /** Opens a camera that reports the given Image Capture capabilities and settings. */
    const capableCamera = (capabilities: Record<string, unknown>, settings: Record<string, unknown> = {}) => {
      const applied: Array<Record<string, unknown>> = [];
      getUserMedia.mockImplementation(async () => {
        const stream = await openTrack();
        const [track] = stream.getTracks();
        Object.assign(track, {
          getCapabilities: () => capabilities,
          getSettings: () => settings,
          applyConstraints: async ({ advanced }: { advanced: Array<Record<string, unknown>> }) => {
            applied.push(...advanced);
            Object.assign(settings, ...advanced);
          },
        });
        return stream;
      });
      return applied;
    };
    const withCameras = (labels: string[]) => {
      const devices = labels.map((label, index) => ({ kind: 'videoinput', deviceId: `cam-${index}`, label }));
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia, enumerateDevices: async () => devices },
        configurable: true,
        writable: true,
      });
    };

    it('shows no controls for a camera without torch, zoom or a second camera', async () => {
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      await settle();
      expect(screen.queryByRole('button', { name: /torch/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('slider', { name: 'Zoom' })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Camera')).not.toBeInTheDocument();
    });

    it('offers the torch and zoom only when the camera supports them, accessibly', async () => {
      const applied = capableCamera({ torch: true, zoom: { min: 1, max: 4, step: 0.5 } }, { zoom: 1, deviceId: 'cam-0' });
      withCameras(['Back Camera', 'Front Camera']);
      const { container } = render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      await settle();
      await settle();

      const torch = await screen.findByRole('button', { name: /torch/i });
      expect(torch).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(torch);
      await settle();
      expect(applied).toContainEqual({ torch: true });
      expect(screen.getByRole('button', { name: /torch/i })).toHaveAttribute('aria-pressed', 'true');

      fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '2.5' } });
      await settle();
      expect(applied).toContainEqual({ zoom: 2.5 });

      expect(screen.getByLabelText('Camera')).toHaveValue('cam-0');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('switches cameras without leaving the old one running', async () => {
      capableCamera({}, { deviceId: 'cam-0' });
      withCameras(['Back Camera', 'Front Camera']);
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      await settle();
      await settle();

      fireEvent.change(await screen.findByLabelText('Camera'), { target: { value: 'cam-1' } });
      await settle();
      expect(getUserMedia).toHaveBeenLastCalledWith(
        expect.objectContaining({ video: expect.objectContaining({ deviceId: { exact: 'cam-1' } }) })
      );
      expect(liveTracks()).toBe(1);
      expect(tracks).toHaveLength(2);
    });

    it('mirrors the preview of a user-facing camera only', async () => {
      capableCamera({}, { facingMode: 'user' });
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      await settle();
      expect(screen.getByLabelText('Webcam feed')).toHaveClass('-scale-x-100');
    });
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

    expect(screen.getByText(/drag & drop qr image/i)).toBeInTheDocument();

    // Mock successful jsQR decoding
    vi.mocked(jsQR).mockReturnValue({ data: 'https://qrcraftly.com' } as any);

    // Mock FileReader and Image loading
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload qr code image file/i);

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
    const fileInput = screen.getByLabelText(/upload qr code image file/i);

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
        // One worker request per uploaded file.
        uploadIndex++;
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
    const fileInput = screen.getByLabelText(/upload qr code image file/i) as HTMLInputElement;

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

  describe('image files only (#1098)', () => {
    it('accepts images only and turns away a dropped video', async () => {
      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      fireEvent.click(screen.getByRole('radio', { name: /file upload/i }));

      expect(screen.getByLabelText('Upload QR code image file')).toHaveAttribute('accept', 'image/*');
      const video = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
      fireEvent.drop(screen.getByText(/drag & drop qr image/i), { dataTransfer: { files: [video] } });

      expect(screen.getByText('Please drop an image file.')).toBeInTheDocument();
      expect(screen.queryByText(/processing file/i)).not.toBeInTheDocument();
      expect(mockOnScanSuccess).not.toHaveBeenCalled();
    });

    it('lets a second file replace the first without an error', async () => {
      const answered: string[] = [];
      globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
        // The first file takes longer than the second. A file cancelled before it was posted is
        // never sent at all.
        const name = msg.file?.name === 'a.png' ? 'first' : 'second';
        setTimeout(() => {
          answered.push(name);
          worker.dispatchMessage({ status: 'pass', sequenceId: msg.sequenceId, decodedData: name });
        }, name === 'first' ? 60 : 10);
      });

      render(<QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />);
      fireEvent.click(screen.getByRole('radio', { name: /file upload/i }));
      const fileInput = screen.getByLabelText('Upload QR code image file');

      fireEvent.change(fileInput, { target: { files: [new File(['a'], 'a.png', { type: 'image/png' })] } });
      fireEvent.change(fileInput, { target: { files: [new File(['b'], 'b.png', { type: 'image/png' })] } });

      await waitFor(() => expect(answered).toContain('second'));
      // Give a first answer, if the first file was posted, time to arrive and be ignored.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });
      expect(mockOnScanSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnScanSuccess).toHaveBeenCalledWith('second');
      expect(screen.queryByText(/already being processed/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/processing file/i)).not.toBeInTheDocument();
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
      const fileInput = screen.getByLabelText(/upload qr code image file/i);

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
      const fileInput = screen.getByLabelText(/upload qr code image file/i);

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
