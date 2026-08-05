import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFieldIds } from './useFieldIds';

describe('useFieldIds hook', () => {
  it('should generate a default id and standard descriptors when no parameters are provided', () => {
    const { result } = renderHook(() => useFieldIds({}));
    expect(result.current.inputId).toBeDefined();
    expect(typeof result.current.inputId).toBe('string');
    expect(result.current.errorId).toBeUndefined();
    expect(result.current.charCountId).toBeUndefined();
    expect(result.current.describedBy).toBeUndefined();
  });

  it('should use provided id', () => {
    const { result } = renderHook(() => useFieldIds({ id: 'my-custom-id' }));
    expect(result.current.inputId).toBe('my-custom-id');
  });

  it('should generate errorId when error is present', () => {
    const { result } = renderHook(() => useFieldIds({ id: 'my-id', error: 'Field is required' }));
    expect(result.current.errorId).toBe('my-id-error');
    expect(result.current.describedBy).toBe('my-id-error');
  });

  it('should generate charCountId when showCharCount and maxLength are active', () => {
    const { result } = renderHook(() =>
      useFieldIds({ id: 'my-id', showCharCount: true, maxLength: 50 })
    );
    expect(result.current.charCountId).toBe('my-id-char-count');
    expect(result.current.describedBy).toBe('my-id-char-count');
  });

  it('should combine all IDs including ariaDescribedby', () => {
    const { result } = renderHook(() =>
      useFieldIds({
        id: 'my-id',
        error: 'Error occurs',
        showCharCount: true,
        maxLength: 100,
        ariaDescribedby: 'extra-describedby',
      })
    );
    expect(result.current.inputId).toBe('my-id');
    expect(result.current.errorId).toBe('my-id-error');
    expect(result.current.charCountId).toBe('my-id-char-count');
    expect(result.current.describedBy).toBe('my-id-error my-id-char-count extra-describedby');
  });
});
