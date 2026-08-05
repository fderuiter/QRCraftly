import { describe, it, expect } from 'vitest';
import { mergeClasses, BASE_INPUT_CLASSES, TEXT_FIELD_CLASSES, TEXT_AREA_CLASSES, ERROR_INPUT_CLASSES } from './styles';

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

describe('placeholder styling and accessibility alignment', () => {
  it('should verify default high-contrast placeholder classes are present in base styles', () => {
    // BASE_INPUT_CLASSES must contain the high-contrast placeholder styles
    expect(BASE_INPUT_CLASSES).toContain('placeholder-slate-600');
    expect(BASE_INPUT_CLASSES).toContain('dark:placeholder-slate-400');

    // TEXT_FIELD_CLASSES must inherit them
    expect(TEXT_FIELD_CLASSES).toContain('placeholder-slate-600');
    expect(TEXT_FIELD_CLASSES).toContain('dark:placeholder-slate-400');

    // TEXT_AREA_CLASSES must inherit them and NOT have the old placeholder-slate-400
    expect(TEXT_AREA_CLASSES).toContain('placeholder-slate-600');
    expect(TEXT_AREA_CLASSES).toContain('dark:placeholder-slate-400');
    expect(TEXT_AREA_CLASSES.split(' ')).not.toContain('placeholder-slate-400');
  });

  it('should override default placeholders correctly during merging', () => {
    // Merge standard override
    const resultStandard = mergeClasses(TEXT_FIELD_CLASSES, 'placeholder-red-500');
    expect(resultStandard).toContain('placeholder-red-500');
    expect(resultStandard).not.toContain('placeholder-slate-600');
    // Dark mode placeholder should be untouched
    expect(resultStandard).toContain('dark:placeholder-slate-400');

    // Merge dark override
    const resultDark = mergeClasses(TEXT_FIELD_CLASSES, 'dark:placeholder-red-400');
    expect(resultDark).toContain('dark:placeholder-red-400');
    expect(resultDark).not.toContain('dark:placeholder-slate-400');
    // Light mode placeholder should be untouched
    expect(resultDark).toContain('placeholder-slate-600');

    // Merge both overrides
    const resultBoth = mergeClasses(TEXT_FIELD_CLASSES, 'placeholder-red-500 dark:placeholder-red-400');
    expect(resultBoth).toContain('placeholder-red-500');
    expect(resultBoth).toContain('dark:placeholder-red-400');
    expect(resultBoth).not.toContain('placeholder-slate-600');
    expect(resultBoth).not.toContain('dark:placeholder-slate-400');
  });
});
