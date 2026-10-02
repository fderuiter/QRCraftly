import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_DURATION_MS, motionAllowed, usePresence } from './usePresence';

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not animate without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(motionAllowed()).toBe(false);
  });

  it('keeps the element mounted and closing for the exit duration when motion is allowed', () => {
    mockReducedMotion(false);
    expect(motionAllowed()).toBe(true);
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } });
    expect(result.current).toEqual({ mounted: true, closing: false });

    rerender({ open: false });
    expect(result.current).toEqual({ mounted: true, closing: true });

    act(() => {
      vi.advanceTimersByTime(EXIT_DURATION_MS);
    });
    expect(result.current).toEqual({ mounted: false, closing: false });
  });

  it('unmounts at once under reduced motion', () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } });
    rerender({ open: false });
    expect(result.current).toEqual({ mounted: false, closing: false });
  });

  it('cancels the exit when reopened mid-animation', () => {
    mockReducedMotion(false);
    const { result, rerender } = renderHook(({ open }) => usePresence(open, 120), { initialProps: { open: true } });
    rerender({ open: false });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    rerender({ open: true });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toEqual({ mounted: true, closing: false });
  });

  it('stays unmounted while closed', () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => usePresence(false));
    expect(result.current).toEqual({ mounted: false, closing: false });
  });
});
