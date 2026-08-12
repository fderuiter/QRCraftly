import { renderHook, act } from '@testing-library/react';
import { useImageUpload } from './useImageUpload';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as security from '../utils/security';

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.spyOn(security, 'validateImageUpload').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles valid image upload', () => {
    const { result } = renderHook(() => useImageUpload());
    const onSuccess = vi.fn();

    // Mock FileReader proper way
    const mockReadAsDataURL = vi.fn();
    const mockFileReaderInstance = {
      readAsDataURL: mockReadAsDataURL,
      onload: null as any,
    };

    class MockFileReader {
      onload: any = null;
      readAsDataURL(file: File) {
        mockReadAsDataURL(file);
        // Link the instance to our mock object so we can trigger it
        mockFileReaderInstance.onload = (e: any) => {
            if (this.onload) this.onload(e);
        };
      }
    }

    const originalFileReader = global.FileReader;
    global.FileReader = MockFileReader as any;

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const event = { target: { files: [file], value: 'test.png' } } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleUpload(event, onSuccess);
    });

    expect(event.target.value).toBe('');
    expect(security.validateImageUpload).toHaveBeenCalledWith(file);
    expect(mockReadAsDataURL).toHaveBeenCalledWith(file);

    act(() => {
      if (mockFileReaderInstance.onload) {
          mockFileReaderInstance.onload({ target: { result: 'data:image/png;base64,dummy' } } as any);
      }
    });

    expect(onSuccess).toHaveBeenCalledWith('data:image/png;base64,dummy');
    expect(result.current.error).toBeNull();

    // Restore
    global.FileReader = originalFileReader;
  });

  it('sets error if validation fails', () => {
    vi.spyOn(security, 'validateImageUpload').mockReturnValue('Validation failed');
    const { result } = renderHook(() => useImageUpload());
    const onSuccess = vi.fn();

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const event = { target: { files: [file], value: 'test.png' } } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleUpload(event, onSuccess);
    });

    expect(event.target.value).toBe('');
    expect(result.current.error).toBe('Validation failed');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('handles SVG upload with sanitization', () => {
    const { result } = renderHook(() => useImageUpload());
    const onSuccess = vi.fn();

    const mockReadAsText = vi.fn();
    const mockFileReaderInstance = {
      readAsText: mockReadAsText,
      onload: null as any,
    };

    class MockFileReader {
      onload: any = null;
      readAsText(file: File) {
        mockReadAsText(file);
        mockFileReaderInstance.onload = (e: any) => {
          if (this.onload) this.onload(e);
        };
      }
    }

    const originalFileReader = global.FileReader;
    global.FileReader = MockFileReader as any;

    const spySanitize = vi.spyOn(security, 'sanitizeSvg').mockReturnValue('<svg xmlns="http://www.w3.org/2000/svg" />');

    const file = new File(['<svg><script>alert(1)</script></svg>'], 'test.svg', { type: 'image/svg+xml' });
    const event = { target: { files: [file], value: 'test.svg' } } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleUpload(event, onSuccess);
    });

    expect(event.target.value).toBe('');
    expect(security.validateImageUpload).toHaveBeenCalledWith(file);
    expect(mockReadAsText).toHaveBeenCalledWith(file);

    act(() => {
      if (mockFileReaderInstance.onload) {
        mockFileReaderInstance.onload({ target: { result: '<svg><script>alert(1)</script></svg>' } } as any);
      }
    });

    expect(spySanitize).toHaveBeenCalledWith('<svg><script>alert(1)</script></svg>');
    const expectedBase64 = btoa(unescape(encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" />')));
    expect(onSuccess).toHaveBeenCalledWith(`data:image/svg+xml;base64,${expectedBase64}`);
    expect(result.current.error).toBeNull();

    global.FileReader = originalFileReader;
  });
});
