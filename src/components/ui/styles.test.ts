import { describe, it, expect } from 'vitest';
import { mergeClasses, TEXT_FIELD_CLASSES, ERROR_INPUT_CLASSES } from './styles';

describe('mergeClasses utility', () => {
  it('should return empty string when no arguments are provided', () => {
    expect(mergeClasses()).toBe('');
    expect(mergeClasses(null, undefined, false)).toBe('');
  });

  it('should filter out falsy values', () => {
    expect(mergeClasses('px-4', null, 'py-2', undefined, false)).toBe('px-4 py-2');
  });

  it('should merge classes and deduplicate raw non-conflicting ones', () => {
    expect(mergeClasses('relative border px-4', 'relative shadow')).toContain('relative');
    expect(mergeClasses('relative relative')).toBe('relative');
  });

  it('should cleanly override padding classes', () => {
    // Overriding general or specific padding
    expect(mergeClasses('px-4 py-2', 'px-6')).toBe('px-6 py-2');
    expect(mergeClasses('p-4', 'p-2')).toBe('p-2');
  });

  it('should override margin classes', () => {
    expect(mergeClasses('m-4 mx-2', 'mx-3')).toBe('m-4 mx-3');
  });

  it('should override border colors correctly', () => {
    const result = mergeClasses('border border-slate-300 dark:border-slate-700', 'border-rose-500');
    expect(result).toContain('border-rose-500');
    expect(result).not.toContain('border-slate-300');
    // dark: border color is not overridden unless dark:modifier is matched
    expect(result).toContain('dark:border-slate-700');
  });

  it('should resolve both light and dark border colors when unified error state is active', () => {
    const result = mergeClasses(TEXT_FIELD_CLASSES, ERROR_INPUT_CLASSES);
    expect(result).toContain('border-rose-500');
    expect(result).toContain('dark:border-rose-500');
    expect(result).not.toContain('border-slate-300');
    expect(result).not.toContain('dark:border-slate-700');
  });
});
