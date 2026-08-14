/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ToastProvider } from "./ui/Toast";
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
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
    render(<ToastProvider><QRTool /></ToastProvider>);
    expect(screen.getByText('QRCraftly')).toBeInTheDocument();
    expect(screen.getByText('Design beautiful QR codes in seconds.')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('exposes file transfer routes from the mobile navigation menu', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);

    const menuButton = screen.getByRole('button', { name: 'File transfer menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const mobileNav = screen.getByRole('navigation', { name: 'File transfer' });
    expect(within(mobileNav).getByRole('link', { name: 'Send File' })).toHaveAttribute('href', '/file-transfer');
    expect(within(mobileNav).getByRole('link', { name: 'Receive File' })).toHaveAttribute('href', '/file-transfer/receive');
  });

  it('applies initial config if provided', () => {
      const initialConfig = { value: 'https://initial-test.com' };
      render(<ToastProvider><QRTool initialConfig={initialConfig} /></ToastProvider>);
      // We check if the input panel reflects this value.
      // Since InputPanel is not mocked here (we want to test integration), we check the input value.
      const urlInput = screen.getByDisplayValue('https://initial-test.com');
      expect(urlInput).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    // We can also check the class on the container
    const { container } = render(<ToastProvider><QRTool /></ToastProvider>);

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
    render(<ToastProvider><QRTool /></ToastProvider>);
    const contentHeaders = screen.getAllByText('Content');
    expect(contentHeaders[0]).toBeInTheDocument();

    const appearanceHeaders = screen.getAllByText('Appearance');
    expect(appearanceHeaders[0]).toBeInTheDocument();
  });

  it('renders Preview Area', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const elements = screen.getAllByText('Live Preview');
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toBeInTheDocument();

    const canvasMocks = screen.getAllByTestId('qr-canvas-mock');
    expect(canvasMocks[0]).toBeInTheDocument();
  });

  it('shows download menu when download button is clicked', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const downloadBtns = screen.getAllByText('Download');
    fireEvent.click(downloadBtns[0]);

    expect(screen.getByText('PNG (High Quality)')).toBeInTheDocument();
    expect(screen.getByText('JPEG (Compact)')).toBeInTheDocument();
    expect(screen.getByText('WebP (Modern)')).toBeInTheDocument();
  });

  it('handles the quick PNG download', () => {
     render(<ToastProvider><QRTool /></ToastProvider>);

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

     const saveBtns = screen.getAllByText('Download PNG');
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

    render(<ToastProvider><QRTool /></ToastProvider>);
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

      render(<ToastProvider><QRTool /></ToastProvider>);
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

      render(<ToastProvider><QRTool /></ToastProvider>);
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

      render(<ToastProvider><QRTool /></ToastProvider>);
      const shareBtn = screen.getByTitle('Share');
      fireEvent.click(shareBtn);

      await waitFor(() => {
          expect(mockShare).toHaveBeenCalled();
      });
  });

  it('does not render share button if Web Share API is not supported', async () => {
    // Set share to undefined
    Object.defineProperty(global.navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true
    });

    render(<ToastProvider><QRTool /></ToastProvider>);
    
    // the share button should not be found
    const shareBtn = screen.queryByTitle('Share');
    expect(shareBtn).toBeNull();
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
      render(<ToastProvider><QRTool /></ToastProvider>);
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
     render(<ToastProvider><QRTool /></ToastProvider>);
     const urlInput = screen.getByLabelText('Website URL');
     fireEvent.change(urlInput, { target: { value: 'https://propagate.com' } });

     // The QRCanvas should receive the new config
     // Since QRCanvas is mocked, we can check if it re-rendered with new props?
     // Or we can check if the input value persisted.

     expect(urlInput).toHaveValue('https://propagate.com');
  });

  describe('Accessibility - Focus Recovery and Toast Announcements', () => {
    it('restores focus and triggers a polite success toast when copy QR code is triggered', async () => {
      // Mock Clipboard API for this test
      const mockWrite = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = global.navigator.clipboard;
      Object.defineProperty(global.navigator, 'clipboard', {
        value: { write: mockWrite },
        writable: true,
        configurable: true,
      });

      const originalClipboardItem = (global as any).ClipboardItem;
      const MockClipboardItem = vi.fn().mockImplementation(function(this: any, data) { this.data = data; });
      (global as any).ClipboardItem = MockClipboardItem;

      try {
        render(<ToastProvider><QRTool /></ToastProvider>);
        const copyBtn = screen.getByTitle('Copy Image');

        // Set focus to the copy button to simulate keyboard/user focus
        copyBtn.focus();
        expect(document.activeElement).toBe(copyBtn);

        fireEvent.click(copyBtn);

        // Verify success toast exists with role="status" and message
        await waitFor(() => {
          const statuses = screen.getAllByRole('status');
          const hasText = statuses.some(s => s.textContent?.includes('QR code copied to clipboard!'));
          expect(hasText).toBe(true);
        });

        // Verify focus is recovered/preserved on the copy button
        expect(document.activeElement).toBe(copyBtn);
      } finally {
        (global as any).ClipboardItem = originalClipboardItem;
        Object.defineProperty(global.navigator, 'clipboard', {
          value: originalClipboard,
          writable: true,
          configurable: true,
        });
      }
    });

    it('restores focus and triggers a polite success toast when Download PNG is triggered', async () => {
      render(<ToastProvider><QRTool /></ToastProvider>);
      const photosBtn = screen.getByLabelText('Download QR code as PNG');

      // Set focus to the save to photos button
      photosBtn.focus();
      expect(document.activeElement).toBe(photosBtn);

      fireEvent.click(photosBtn);

      // Verify success toast exists with role="status" and message
      await waitFor(() => {
        const statuses = screen.getAllByRole('status');
        const hasText = statuses.some(s => s.textContent?.includes('QR code exported successfully as PNG!'));
        expect(hasText).toBe(true);
      });

      // Verify focus is restored to the photos button
      expect(document.activeElement).toBe(photosBtn);
    });

    it('restores focus and triggers a polite success toast when SVG download is triggered from the menu', async () => {
      render(<ToastProvider><QRTool /></ToastProvider>);
      const downloadBtn = screen.getAllByText('Download')[0];

      // Set focus to the Download button
      downloadBtn.focus();
      expect(document.activeElement).toBe(downloadBtn);

      // Open the dropdown menu
      fireEvent.click(downloadBtn);

      const svgOption = screen.getByText('SVG (Vector)');
      fireEvent.click(svgOption);

      // Verify success toast exists with role="status" and message
      await waitFor(() => {
        const statuses = screen.getAllByRole('status');
        const hasText = statuses.some(s => s.textContent?.includes('QR code exported successfully as SVG!'));
        expect(hasText).toBe(true);
      });

      // Verify focus is returned to the main Download trigger button
      expect(document.activeElement).toBe(downloadBtn);
    });

    it('triggers a warning toast when SVG download is triggered and remote logo fetch fails', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      } as any);

      try {
        const initialConfig = {
          logoUrl: 'https://example.com/blocked-by-cors-logo.png',
        };
        render(<ToastProvider><QRTool initialConfig={initialConfig} /></ToastProvider>);
        const downloadBtn = screen.getAllByText('Download')[0];

        // Open the dropdown menu
        fireEvent.click(downloadBtn);

        const svgOption = screen.getByText('SVG (Vector)');
        fireEvent.click(svgOption);

        // Verify warning toast exists with role="alert" and the expected warning message
        await waitFor(() => {
          const alerts = screen.getAllByRole('alert');
          const hasText = alerts.some(a => a.textContent?.includes('The remote logo was omitted from the SVG export due to connection or security limits. Try uploading a local image file instead.'));
          expect(hasText).toBe(true);
        });

        // Verify focus is returned to the main Download trigger button
        expect(document.activeElement).toBe(downloadBtn);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('restores focus and triggers a success toast when Web Share API is triggered', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);
      const originalShare = global.navigator.share;
      const originalCanShare = global.navigator.canShare;

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

      try {
        render(<ToastProvider><QRTool /></ToastProvider>);
        const shareBtn = screen.getByTitle('Share');

        // Focus the share button
        shareBtn.focus();
        expect(document.activeElement).toBe(shareBtn);

        fireEvent.click(shareBtn);

        await waitFor(() => {
          const statuses = screen.getAllByRole('status');
          const hasText = statuses.some(s => s.textContent?.includes('QR code shared successfully!'));
          expect(hasText).toBe(true);
        });

        // Focus is returned/preserved on the share button
        expect(document.activeElement).toBe(shareBtn);
      } finally {
        Object.defineProperty(global.navigator, 'share', {
            value: originalShare,
            writable: true,
            configurable: true
        });
        Object.defineProperty(global.navigator, 'canShare', {
            value: originalCanShare,
            writable: true,
            configurable: true
        });
      }
    });
  });
});
