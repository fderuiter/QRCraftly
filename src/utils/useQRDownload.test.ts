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

import { renderHook, waitFor, act } from '@testing-library/react';
import { useQRDownload } from './useQRDownload';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig } from '../types';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useQRDownload', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockQrRef: any;
  let originalShowSaveFilePicker: any;

  beforeEach(() => {
    // Setup mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
    mockCanvas.toBlob = vi.fn((callback) => callback(new Blob(['mock']), 'image/png'));

    // Setup mock ref
    mockQrRef = {
      current: {
        querySelector: vi.fn(() => mockCanvas),
      },
    };

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Store original globals
    originalShowSaveFilePicker = (global as any).showSaveFilePicker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalShowSaveFilePicker) {
      (global as any).showSaveFilePicker = originalShowSaveFilePicker;
    } else {
      delete (global as any).showSaveFilePicker;
    }
  });

  it('downloadToDevice creates a download link and clicks it', () => {
    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    result.current.downloadToDevice('png');

    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(appendSpy).toHaveBeenCalled();
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.download).toMatch(/url-qr-code-qrcraftly-.*\.png/);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(link);
  });

  it('handleSaveAs uses File System Access API if available', async () => {
    const mockHandle = {
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
    (global as any).showSaveFilePicker = showSaveFilePicker;

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

    await result.current.handleSaveAs('png');

    expect(showSaveFilePicker).toHaveBeenCalled();
    expect(mockHandle.createWritable).toHaveBeenCalled();
  });

  it('handleSaveAs falls back to downloadToDevice if File System Access API fails', async () => {
    (global as any).showSaveFilePicker = vi.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Spy on internal downloadToDevice call indirectly via document append
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await result.current.handleSaveAs('png');

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
  });

  it('handleSaveAs returns early if canvas is not found', async () => {
    const emptyRef = { current: { querySelector: vi.fn(() => null) } } as any;
    const { result } = renderHook(() => useQRDownload(emptyRef, DEFAULT_CONFIG as QRConfig));
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await result.current.handleSaveAs('png');

    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('handleSaveAs falls back to downloadToDevice if File System Access API is not available', async () => {
    const tempOriginal = (global as any).showSaveFilePicker;
    delete (global as any).showSaveFilePicker;

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await result.current.handleSaveAs('png');

    expect(appendSpy).toHaveBeenCalled();

    (global as any).showSaveFilePicker = tempOriginal;
  });

  it('handleSaveAs throws error when toBlob fails', async () => {
    mockCanvas.toBlob = vi.fn((callback) => callback(null));
    const showSaveFilePicker = vi.fn();
    (global as any).showSaveFilePicker = showSaveFilePicker;

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await result.current.handleSaveAs('png');

    expect(consoleWarnSpy).toHaveBeenCalledWith('File System Access API failed, falling back to standard download:', expect.any(Error));
  });

  it('handleSaveAs aborts silently if AbortError is thrown', async () => {
    const abortError = new Error('Abort');
    abortError.name = 'AbortError';
    (global as any).showSaveFilePicker = vi.fn().mockRejectedValue(abortError);

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await result.current.handleSaveAs('png');

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('handleShare uses Web Share API', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.navigator, 'canShare', {
      value: mockCanShare,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

    await result.current.handleShare();

    await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
    });
  });

  it('handleShare catches and logs errors when sharing fails', async () => {
    const mockError = new Error('Sharing failed');
    const mockShare = vi.fn().mockRejectedValue(mockError);
    const mockCanShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.navigator, 'canShare', {
      value: mockCanShare,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await result.current.handleShare();

    await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('Error sharing:', mockError);
    });
  });

  it('handleShare aborts silently if toBlob returns null', async () => {
    mockCanvas.toBlob = vi.fn((callback) => callback(null));

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

    await result.current.handleShare();

    expect(mockShare).not.toHaveBeenCalled();
  });

  it('handleShare falls back if sharing not supported', async () => {
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await act(async () => {
      await result.current.handleShare();
    });

    expect(result.current.shareFallbackMessage).toBe("Sharing is not supported on this device/browser. The image will be downloaded instead.");
    expect(appendSpy).toHaveBeenCalled();
  });

  it('handleSaveSvg triggers a download with an .svg file', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

    await result.current.handleSaveSvg();

    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Find the <a> element among all appended children
    const appendedElements = appendSpy.mock.calls.map(call => call[0] as Element);
    const link = appendedElements.find(el => el.tagName === 'A') as HTMLAnchorElement;
    expect(link).toBeDefined();
    expect((link as HTMLAnchorElement).download).toMatch(/url-qr-code-qrcraftly-.*\.svg/);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(link);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('handleSaveSvg catches and logs errors when Blob generation fails', async () => {
    // We mock the Blob constructor to throw an error to test the catch block.
    const originalBlob = global.Blob;
    global.Blob = vi.fn().mockImplementation(() => {
      throw new Error('Blob Error');
    });

    const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await result.current.handleSaveSvg();

    expect(consoleWarnSpy).toHaveBeenCalledWith('SVG export failed:', expect.any(Error));

    global.Blob = originalBlob;
  });

  describe('handleCopy', () => {
    let originalClipboardItem: any;
    let originalClipboard: any;

    beforeEach(() => {
      originalClipboardItem = (global as any).ClipboardItem;
      originalClipboard = global.navigator.clipboard;
    });

    afterEach(() => {
      (global as any).ClipboardItem = originalClipboardItem;
      Object.defineProperty(global.navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });

    it('copies to clipboard when supported', async () => {
      const mockWrite = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(global.navigator, 'clipboard', {
        value: { write: mockWrite },
        writable: true,
        configurable: true,
      });

      const MockClipboardItem = vi.fn().mockImplementation(function(this: any, data) { this.data = data; });
      (global as any).ClipboardItem = MockClipboardItem;

      const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

      const success = await result.current.handleCopy();

      expect(success).toBe(true);
      expect(mockCanvas.toBlob).toHaveBeenCalled();
      expect(MockClipboardItem).toHaveBeenCalledWith(expect.objectContaining({ 'image/png': expect.any(Blob) }));
      expect(mockWrite).toHaveBeenCalled();
    });

    it('returns false if canvas is not found', async () => {
      const emptyRef = { current: { querySelector: vi.fn(() => null) } } as any;
      const { result } = renderHook(() => useQRDownload(emptyRef, DEFAULT_CONFIG as QRConfig));

      const success = await result.current.handleCopy();
      expect(success).toBe(false);
    });

    it('returns false if ClipboardItem is not supported', async () => {
      (global as any).ClipboardItem = undefined;
      const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

      const success = await result.current.handleCopy();
      expect(success).toBe(false);
    });

    it('returns false and logs warning if write fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockWrite = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.defineProperty(global.navigator, 'clipboard', {
        value: { write: mockWrite },
        writable: true,
        configurable: true,
      });

      const MockClipboardItem = vi.fn().mockImplementation(function(this: any, data) { this.data = data; });
      (global as any).ClipboardItem = MockClipboardItem;

      const { result } = renderHook(() => useQRDownload(mockQrRef, DEFAULT_CONFIG as QRConfig));

      const success = await result.current.handleCopy();

      expect(success).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));
    });
  });

});
