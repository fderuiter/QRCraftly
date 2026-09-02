// @vitest-environment jsdom
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

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageLoader, ImageLoadingStatus } from './useImageLoader';

describe('useImageLoader', () => {
  let originalImage: typeof window.Image;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalImage = window.Image;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn((blob) => `blob:test-url-${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    window.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('starts in idle state when source is null', () => {
    const { result } = renderHook(() => useImageLoader(null));

    const status: ImageLoadingStatus = result.current.status;
    expect(result.current.image).toBeNull();
    expect(status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.dimensions).toBeNull();
  });

  it('handles successful image loading and updates dimensions and status', async () => {
    let mockImgInstance: any = null;
    window.Image = class {
      onload: any = null;
      onerror: any = null;
      src = '';
      complete = false;
      naturalWidth = 800;
      naturalHeight = 600;
      constructor() {
        mockImgInstance = this;
      }
    } as any;

    const { result } = renderHook(() => useImageLoader('http://example.com/logo.png', { maxDim: 400 }));

    expect(result.current.status).toBe('loading');

    await act(async () => {
      if (mockImgInstance.onload) {
        mockImgInstance.onload();
      }
    });

    expect(result.current.status).toBe('loaded');
    expect(result.current.image).toBe(mockImgInstance);
    expect(result.current.dimensions).toEqual({ width: 800, height: 600, aspectRatio: 800 / 600 });
    expect(result.current.bounds).toEqual({ width: 400, height: 300, aspectRatio: 800 / 600 });
  });

  it('handles image loading errors and sets status to error', async () => {
    let mockImgInstance: any = null;
    window.Image = class {
      onload: any = null;
      onerror: any = null;
      src = '';
      complete = false;
      constructor() {
        mockImgInstance = this;
      }
    } as any;

    const { result } = renderHook(() => useImageLoader('http://example.com/broken.png'));

    expect(result.current.status).toBe('loading');

    await act(async () => {
      if (mockImgInstance.onerror) {
        mockImgInstance.onerror();
      }
    });

    expect(result.current.status).toBe('error');
    expect(result.current.image).toBeNull();
    expect(result.current.error).toBe('Failed to load image asset');
  });

  it('creates and revokes Object URLs for Blob sources on unmount and source changes', async () => {
    let mockImgInstance: any = null;
    window.Image = class {
      onload: any = null;
      onerror: any = null;
      src = '';
      complete = false;
      naturalWidth = 100;
      naturalHeight = 100;
      constructor() {
        mockImgInstance = this;
      }
    } as any;

    const blob1 = new Blob(['image1'], { type: 'image/png' });
    const { result, unmount, rerender } = renderHook(({ src }) => useImageLoader(src), {
      initialProps: { src: blob1 as Blob | null }
    });

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob1);

    await act(async () => {
      if (mockImgInstance.onload) {
        mockImgInstance.onload();
      }
    });

    const blob2 = new Blob(['image2'], { type: 'image/png' });
    rerender({ src: blob2 });

    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob2);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('resets state and cleans up Object URLs when reset is invoked', async () => {
    let mockImgInstance: any = null;
    window.Image = class {
      onload: any = null;
      onerror: any = null;
      src = '';
      complete = false;
      naturalWidth = 100;
      naturalHeight = 100;
      constructor() {
        mockImgInstance = this;
      }
    } as any;

    const blob = new Blob(['image'], { type: 'image/png' });
    const { result } = renderHook(() => useImageLoader(blob));

    await act(async () => {
      if (mockImgInstance.onload) {
        mockImgInstance.onload();
      }
    });

    expect(result.current.status).toBe('loaded');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.image).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
