import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQRDownload } from './useQRDownload';
import { renderHook } from '@testing-library/react';
import { QRConfig, QRType } from '../types';

describe('useQRDownload', () => {
  const mockConfig: QRConfig = {
    type: QRType.URL,
    value: 'https://example.com',
    fgColor: '#000000',
    bgColor: '#ffffff',
    style: 'standard' as any,
    logoUrl: null,
    logoSize: 0.2,
    logoPaddingStyle: 'square',
    logoPadding: 1,
    logoBackgroundColor: '#ffffff',
    eyeColor: '#000000',
    errorCorrectionLevel: 'H',
    isBorderEnabled: false,
    borderSize: 0.05,
    borderColor: '#000000',
    borderStyle: 'solid',
    borderText: '',
    borderTextPosition: 'bottom-center',
    borderTextColor: '#ffffff',
    borderLogoUrl: null,
    borderLogoPosition: 'bottom-center',
  };

  let mockCanvas: any;
  let mockRef: any;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,fake');
    mockCanvas.toBlob = vi.fn((cb) => cb(new Blob(['fake'], { type: 'image/png' })));

    mockRef = {
      current: {
        querySelector: vi.fn().mockReturnValue(mockCanvas),
      },
    };

    // Spy on appendChild to verify anchor insertion
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    // Spy on click
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // Mock navigator.share
    Object.assign(navigator, {
      share: vi.fn(),
      canShare: vi.fn().mockReturnValue(true),
    });

    // Mock window.showSaveFilePicker
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn(),
        close: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).showSaveFilePicker;
  });

  it('should download to device correctly', () => {
    const { result } = renderHook(() => useQRDownload(mockRef, mockConfig));
    const { downloadToDevice } = result.current;

    downloadToDevice('png');

    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');

    // Check if an anchor tag was appended
    expect(document.body.appendChild).toHaveBeenCalled();
    const calls = vi.mocked(document.body.appendChild).mock.calls;
    const anchorCall = calls.find(call => call[0] instanceof HTMLAnchorElement);
    expect(anchorCall).toBeDefined();
    const appendedNode = anchorCall![0] as HTMLAnchorElement;

    expect(appendedNode.download).toContain('.png');
    expect(appendedNode.href).toBe('data:image/png;base64,fake');

    // Check click
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    // Check remove
    expect(document.body.removeChild).toHaveBeenCalledWith(appendedNode);
  });

  it('should handle save as with File System Access API', async () => {
    const { result } = renderHook(() => useQRDownload(mockRef, mockConfig));
    const { handleSaveAs } = result.current;

    await handleSaveAs('png');

    expect((window as any).showSaveFilePicker).toHaveBeenCalled();
    expect(mockCanvas.toBlob).toHaveBeenCalled();
  });

  it('should fallback to downloadToDevice if File System Access API is not available', async () => {
    delete (window as any).showSaveFilePicker;

    const { result } = renderHook(() => useQRDownload(mockRef, mockConfig));
    const { handleSaveAs } = result.current;

    await handleSaveAs('png');

    // Should trigger downloadToDevice logic -> appendChild with anchor
    expect(document.body.appendChild).toHaveBeenCalled();
    const calls = vi.mocked(document.body.appendChild).mock.calls;
    const anchorCall = calls.find(call => call[0] instanceof HTMLAnchorElement);
    expect(anchorCall).toBeDefined();
    const appendedNode = anchorCall![0];
    expect(appendedNode).toBeInstanceOf(HTMLAnchorElement);
  });

  it('should handle share correctly', async () => {
    const { result } = renderHook(() => useQRDownload(mockRef, mockConfig));
    const { handleShare } = result.current;

    await handleShare();

    expect(mockCanvas.toBlob).toHaveBeenCalled();
    expect(navigator.share).toHaveBeenCalled();
  });
});
