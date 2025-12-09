import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import QRTool from './QRTool';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock QRCanvas because it uses canvas which is hard to test in jsdom,
// and we want to test App logic not the library
vi.mock('./QRCanvas', () => ({
  default: () => {
    // We create a canvas element so that interactions like toDataURL work if queried
    return <div data-testid="qr-canvas-mock"><canvas data-testid="mock-canvas" /></div>;
  }
}));

describe('QRTool Component', () => {
  // Store original globals
  const originalNavigator = global.navigator;
  const originalShowSaveFilePicker = (global as any).showSaveFilePicker;

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock Canvas toDataURL and toBlob
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(new Blob(['mock']), 'image/png'));
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore globals
    if (originalShowSaveFilePicker) {
        (global as any).showSaveFilePicker = originalShowSaveFilePicker;
    } else {
        delete (global as any).showSaveFilePicker;
    }

    // We can't strictly delete navigator usually, but we can try to reset props
    // We should assume tests are independent enough or manually clean up changes

    cleanup();
  });

  it('renders without crashing', () => {
    render(<QRTool />);
    expect(screen.getByText('QRCraftly')).toBeInTheDocument();
    expect(screen.getByText('Design beautiful QR codes in seconds.')).toBeInTheDocument();
  });

  it('applies initial config if provided', () => {
      const initialConfig = { value: 'https://initial-test.com' };
      render(<QRTool initialConfig={initialConfig} />);
      // We check if the input panel reflects this value.
      // Since InputPanel is not mocked here (we want to test integration), we check the input value.
      const urlInput = screen.getByDisplayValue('https://initial-test.com');
      expect(urlInput).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    // We can also check the class on the container
    const { container } = render(<QRTool />);

    // Initially light mode (no 'dark' class on top div)
    // The top div is the first child of the container
    const appDiv = container.firstChild as HTMLElement;
    expect(appDiv).not.toHaveClass('dark');

    const toggleButtons = screen.getAllByTitle('Switch to Dark Mode');
    expect(toggleButtons[0]).toBeInTheDocument();

    fireEvent.click(toggleButtons[0]);

    expect(screen.getByTitle('Switch to Light Mode')).toBeInTheDocument();
    expect(appDiv).toHaveClass('dark');
  });

  it('renders InputPanel and StyleControls', () => {
    render(<QRTool />);
    const contentHeaders = screen.getAllByText('Content');
    expect(contentHeaders[0]).toBeInTheDocument();

    const appearanceHeaders = screen.getAllByText('Appearance');
    expect(appearanceHeaders[0]).toBeInTheDocument();
  });

  it('renders Preview Area', () => {
    render(<QRTool />);
    const elements = screen.getAllByText('Live Preview');
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toBeInTheDocument();

    const canvasMocks = screen.getAllByTestId('qr-canvas-mock');
    expect(canvasMocks[0]).toBeInTheDocument();
  });

  it('shows download menu when download button is clicked', () => {
    render(<QRTool />);
    const downloadBtns = screen.getAllByText('Download');
    fireEvent.click(downloadBtns[0]);

    expect(screen.getByText('PNG (High Quality)')).toBeInTheDocument();
    expect(screen.getByText('JPEG (Compact)')).toBeInTheDocument();
    expect(screen.getByText('WebP (Modern)')).toBeInTheDocument();
  });

  it('handles save to photos (downloadToDevice) fallback', () => {
     render(<QRTool />);

     // Spy on document.createElement but we can't easily mock return value without affecting internal React logic if it uses 'a' tags (it might)
     // Instead, spy on appendChild.
     const appendSpy = vi.spyOn(document.body, 'appendChild');
     const removeSpy = vi.spyOn(document.body, 'removeChild');

     // We rely on the fact that the component calls `click()` on the created element.
     // Since we don't control the creation, the created element is a real HTMLAnchorElement.
     // `click()` on a real element in JSDOM doesn't do much unless we listen for it, or spy on it.
     // But we can't spy on it before it's created.
     // BUT, we can inspect the element PASSED to appendChild.
     // And check its attributes.

     // To verify click, we can spy on HTMLAnchorElement.prototype.click
     const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

     const saveBtns = screen.getAllByText('Save to Photos');
     fireEvent.click(saveBtns[0]);

     expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');

     expect(appendSpy).toHaveBeenCalled();
     const appendedElement = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
     expect(appendedElement.tagName).toBe('A');
     expect(appendedElement.download).toContain('.png');

     expect(clickSpy).toHaveBeenCalled();
     expect(removeSpy).toHaveBeenCalledWith(appendedElement);
  });

  it('handles handleSaveAs with File System Access API', async () => {
    const mockHandle = {
        createWritable: vi.fn().mockResolvedValue({
            write: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
        }),
    };
    const showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);

    // Manual mock
    Object.defineProperty(global, 'showSaveFilePicker', {
        value: showSaveFilePicker,
        writable: true,
        configurable: true
    });

    render(<QRTool />);
    const downloadBtns = screen.getAllByText('Download');
    fireEvent.click(downloadBtns[0]);

    const pngOption = screen.getByText('PNG (High Quality)');
    fireEvent.click(pngOption);

    await waitFor(() => {
        expect(showSaveFilePicker).toHaveBeenCalled();
        expect(mockHandle.createWritable).toHaveBeenCalled();
    });
  });

  it('handles AbortError in handleSaveAs gracefully', async () => {
      // Simulate user cancelling the picker
      const showSaveFilePicker = vi.fn().mockRejectedValue({ name: 'AbortError' });

      Object.defineProperty(global, 'showSaveFilePicker', {
          value: showSaveFilePicker,
          writable: true,
          configurable: true
      });

      // Spy on downloadToDevice (by spying on anchor click)
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

      render(<QRTool />);
      const downloadBtns = screen.getAllByText('Download');
      fireEvent.click(downloadBtns[0]);

      const pngOption = screen.getByText('PNG (High Quality)');
      fireEvent.click(pngOption);

      await waitFor(() => {
          expect(showSaveFilePicker).toHaveBeenCalled();
      });

      // Should NOT fall back to downloadToDevice for AbortError
      expect(clickSpy).not.toHaveBeenCalled();
  });

  it('falls back to download if File System Access API fails/missing', async () => {
      // Ensure showSaveFilePicker is NOT present
      if ((global as any).showSaveFilePicker) {
          delete (global as any).showSaveFilePicker;
      }

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      render(<QRTool />);
      const downloadBtns = screen.getAllByText('Download');
      fireEvent.click(downloadBtns[0]);

      const pngOption = screen.getByText('PNG (High Quality)');
      fireEvent.click(pngOption);

      await waitFor(() => {
          expect(clickSpy).toHaveBeenCalled();
          expect(appendSpy).toHaveBeenCalled();
      });
  });

  it('handles Web Share API', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);

      Object.defineProperty(global.navigator, 'share', {
          value: mockShare,
          writable: true,
          configurable: true
      });
      Object.defineProperty(global.navigator, 'canShare', {
          value: mockCanShare,
          writable: true,
          configurable: true
      });

      render(<QRTool />);
      const shareBtn = screen.getByTitle('Share');
      fireEvent.click(shareBtn);

      await waitFor(() => {
          expect(mockShare).toHaveBeenCalled();
      });
  });

  it('falls back if Web Share API is not supported', async () => {
    // Set share to undefined
    Object.defineProperty(global.navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true
    });

    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    render(<QRTool />);
    const shareBtn = screen.getByTitle('Share');
    fireEvent.click(shareBtn);

    await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("Sharing is not supported"));
        expect(clickSpy).toHaveBeenCalled();
    });
  });

  it('catches blob creation failure in handleSaveAs', async () => {
      // Mock toBlob to fail
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(null as any, 'image/png'));
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Force fallback path by mocking showSaveFilePicker as failing
      const showSaveFilePicker = vi.fn().mockRejectedValue(new Error('Nope'));
      Object.defineProperty(global, 'showSaveFilePicker', {
          value: showSaveFilePicker,
          writable: true,
          configurable: true
      });

      // downloadToDevice should be called as fallback (or nothing if blob fails early?)
      // Wait, if toBlob returns null, handleSaveAs returns early (line 98: if (!blob) throw...)
      // The error is caught in catch block.
      // If fs access is available, it goes to catch.

      // Let's test the path where showSaveFilePicker is available but blob creation fails
      render(<QRTool />);
      const downloadBtns = screen.getAllByText('Download');
      fireEvent.click(downloadBtns[0]);
      const pngOption = screen.getByText('PNG (High Quality)');
      fireEvent.click(pngOption);

      await waitFor(() => {
         // It should catch the error "Failed to create image blob" and log warning then fallback
         expect(consoleWarn).toHaveBeenCalled();
      });
  });

  it('updates configuration when InputPanel triggers onChange', async () => {
     // Integration test to verify config propagation
     render(<QRTool />);
     const urlInput = screen.getByLabelText('Website URL');
     fireEvent.change(urlInput, { target: { value: 'https://propagate.com' } });

     // The QRCanvas should receive the new config
     // Since QRCanvas is mocked, we can check if it re-rendered with new props?
     // Or we can check if the input value persisted.

     expect(urlInput).toHaveValue('https://propagate.com');
  });
});
