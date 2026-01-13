import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useDebounce, useQRInputState } from './hooks';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Should still be initial
    expect(result.current).toBe('initial');

    // Advance time by 200ms (less than delay)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Advance time by 300ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer if value changes before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // First update
    rerender({ value: 'update1', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // Second update before timeout
    rerender({ value: 'update2', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300); // Total 600ms from start, but only 300ms from second update
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200); // Total 500ms from second update
    });
    expect(result.current).toBe('update2');
  });
});

describe('useQRInputState', () => {
  type TestData = { field: string };
  const mockConstructor = (data: TestData) => `constructed:${data.field}`;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with provided state', () => {
    const mockOnChange = vi.fn();
    const { result } = renderHook(() =>
      useQRInputState({ field: 'init' }, mockConstructor, mockOnChange)
    );

    const [data] = result.current;
    expect(data).toEqual({ field: 'init' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should update state and call onChange with constructed string after debounce', () => {
    const mockOnChange = vi.fn();
    const { result } = renderHook(() =>
      useQRInputState({ field: 'init' }, mockConstructor, mockOnChange, 100)
    );

    const [, update] = result.current;

    act(() => {
      update({ field: 'new' });
    });

    const [data] = result.current;
    expect(data).toEqual({ field: 'new' });

    // Should not be called immediately due to debounce
    expect(mockOnChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnChange).toHaveBeenCalledWith({ value: 'constructed:new' });
  });

  it('should merge partial updates and respect debounce', () => {
    type ComplexData = { a: string; b: number };
    const complexConstructor = (d: ComplexData) => `${d.a}:${d.b}`;
    const mockOnChange = vi.fn();

    const { result } = renderHook(() =>
      useQRInputState<ComplexData>(
        { a: 'start', b: 1 },
        complexConstructor,
        mockOnChange,
        100
      )
    );

    const [, update] = result.current;

    act(() => {
      update({ b: 2 });
    });

    const [data] = result.current;
    expect(data).toEqual({ a: 'start', b: 2 });

    expect(mockOnChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnChange).toHaveBeenCalledWith({ value: 'start:2' });
  });

  it('should run immediately if debounceDelay is 0', () => {
    const mockOnChange = vi.fn();
    const { result } = renderHook(() =>
      useQRInputState({ field: 'init' }, mockConstructor, mockOnChange, 0)
    );

    const [, update] = result.current;

    act(() => {
      update({ field: 'new' });
    });

    expect(mockOnChange).toHaveBeenCalledWith({ value: 'constructed:new' });
  });
});
