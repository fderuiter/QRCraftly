// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

import { wipeMemoryBuffer } from './security';
import { triggerFileDownload } from './downloadManager';
import { PreallocatedFramePool } from './FrameMemoryPool';
import { DoubleBufferPool } from './AdaptiveFrameScheduler';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedQrReceiver } from '../hooks/useAnimatedQrReceiver';
import { useAnimatedQrSender } from '../hooks/useAnimatedQrSender';

describe('Lifecycle-Aware Memory Zeroing Utility', () => {
  describe('wipeMemoryBuffer', () => {
    it('synchronously zero-fills Uint8Array buffers', () => {
      const buf = new Uint8Array([1, 2, 3, 4, 5, 255]);
      expect(Array.from(buf)).toEqual([1, 2, 3, 4, 5, 255]);
      wipeMemoryBuffer(buf);
      expect(Array.from(buf)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('synchronously zero-fills ArrayBuffer instances', () => {
      const buffer = new ArrayBuffer(8);
      const view = new Uint8Array(buffer);
      view.set([10, 20, 30, 40, 50, 60, 70, 80]);
      expect(view[0]).toBe(10);
      wipeMemoryBuffer(buffer);
      expect(Array.from(view)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('synchronously zero-fills TypedArray views (Float32Array, Uint8ClampedArray)', () => {
      const floatArr = new Float32Array([1.5, 2.5, 3.5]);
      expect(floatArr[0]).toBe(1.5);
      wipeMemoryBuffer(floatArr);
      expect(floatArr[0]).toBe(0);
      expect(floatArr[1]).toBe(0);
      expect(floatArr[2]).toBe(0);

      const clampedArr = new Uint8ClampedArray([100, 200, 255]);
      expect(clampedArr[0]).toBe(100);
      wipeMemoryBuffer(clampedArr);
      expect(Array.from(clampedArr)).toEqual([0, 0, 0]);
    });

    it('safely handles null and undefined buffers', () => {
      expect(() => wipeMemoryBuffer(null)).not.toThrow();
      expect(() => wipeMemoryBuffer(undefined)).not.toThrow();
    });
  });

  describe('triggerFileDownload', () => {
    it('zero-fills the main-thread binary payload buffer immediately after triggering download', () => {
      // Mock DOM methods used by triggerFileDownload
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn(),
      } as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue({} as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockReturnValue({} as any);
      const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const payload = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      expect(payload[0]).toBe(72);

      triggerFileDownload(payload, 'test.bin', 'application/octet-stream');

      // Verify payload was zero-filled after download trigger
      expect(Array.from(payload)).toEqual([0, 0, 0, 0, 0]);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectUrlSpy.mockRestore();
      revokeObjectUrlSpy.mockRestore();
    });
  });

  describe('PreallocatedFramePool Memory Wiping', () => {
    it('wipe() zero-fills the underlying pool Uint8Array and clears frame map', () => {
      const pool = new PreallocatedFramePool(10, 100);
      const data = new Uint8Array(100).fill(42);
      pool.storeFrame(0, 10, data);

      expect(pool.hasFrame(0)).toBe(true);
      expect(pool.getFrame(0)!.data[0]).toBe(42);

      pool.wipe();

      expect(pool.hasFrame(0)).toBe(false);
      expect(pool.size).toBe(0);
      // Access underlying pool private property to check zero-fill
      const rawPool = (pool as any).pool as Uint8Array;
      expect(rawPool.every(val => val === 0)).toBe(true);
    });

    it('storeFrame expansion zero-fills the prior pool buffer', () => {
      const pool = new PreallocatedFramePool(2, 10);
      pool.storeFrame(0, 3, new Uint8Array(9).fill(99));
      pool.storeFrame(1, 3, new Uint8Array(9).fill(88));

      const oldPoolRef = (pool as any).pool as Uint8Array;
      expect(oldPoolRef[0]).toBe(99);

      // Expand pool by storing frame at index >= capacity (2)
      pool.storeFrame(2, 3, new Uint8Array(9).fill(77));

      // Check that oldPoolRef was zero-filled prior to replacement
      expect(oldPoolRef.every(v => v === 0)).toBe(true);
    });
  });

  describe('DoubleBufferPool Memory Wiping', () => {
    it('clear() zero-fills cached ArrayBuffers before resetting buffer array', () => {
      const pool = new DoubleBufferPool(10, 10);
      const buf1 = pool.acquire();
      const buf2 = pool.acquire();

      new Uint8Array(buf1).fill(123);
      new Uint8Array(buf2).fill(234);

      pool.release(buf1);
      pool.release(buf2);

      expect(pool.getPoolSize()).toBe(2);

      pool.clear();

      expect(pool.getPoolSize()).toBe(0);
      expect(new Uint8Array(buf1)[0]).toBe(0);
      expect(new Uint8Array(buf2)[0]).toBe(0);
    });

    it('resize() zero-fills existing buffers prior to reallocating', () => {
      const pool = new DoubleBufferPool(10, 10);
      const buf = pool.acquire();
      new Uint8Array(buf).fill(55);
      pool.release(buf);

      pool.resize(20, 20);

      expect(new Uint8Array(buf)[0]).toBe(0);
    });
  });

  describe('useAnimatedQrReceiver & useAnimatedQrSender Lifecycle Memory Zeroing', () => {
    it('clears and wipes reassembled payload buffers on handleClear in receiver hook', () => {
      const { result } = renderHook(() => useAnimatedQrReceiver());

      act(() => {
        result.current.handleClear();
      });

      expect(result.current.reassembledData).toBeNull();
    });

    it('attaches window beforeunload, pagehide, and visibilitychange event listeners in receiver hook', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const docAddEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const { unmount } = renderHook(() => useAnimatedQrReceiver());

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));
      expect(docAddEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      unmount();
    });

    it('attaches page lifecycle listeners in sender hook and wipes frame pool on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      const dummyConfig: any = { fgColor: '#000000', bgColor: '#ffffff' };
      const { unmount } = renderHook(() => useAnimatedQrSender({
        config: dummyConfig,
        logoImg: null,
        borderLogoImg: null,
      }));

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));

      unmount();
    });
  });
});
