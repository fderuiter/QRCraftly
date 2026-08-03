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

  describe('refined sub-grouping requirements', () => {
    it('should isolate and merge text sizes independently from text colors (Requirement 1)', () => {
      // Concurrently rendering small text size and grey text color
      const result = mergeClasses('text-sm text-slate-500').split(' ');
      expect(result).toContain('text-sm');
      expect(result).toContain('text-slate-500');

      // Overriding text sizes and colors independently
      const overridden = mergeClasses('text-sm text-slate-500', 'text-xs text-red-500').split(' ');
      expect(overridden).toContain('text-xs');
      expect(overridden).toContain('text-red-500');
      expect(overridden).not.toContain('text-sm');
      expect(overridden).not.toContain('text-slate-500');

      // Handles arbitrary notation for size and color independently
      const arbitrary = mergeClasses('text-[14px] text-[#ff0000]', 'text-[16px]').split(' ');
      expect(arbitrary).toContain('text-[16px]');
      expect(arbitrary).toContain('text-[#ff0000]');
      expect(arbitrary).not.toContain('text-[14px]');
    });

    it('should separate background colors from background opacity parameters (Requirement 2)', () => {
      // Preserving custom background color and background opacity concurrently
      const result = mergeClasses('bg-white bg-opacity-50').split(' ');
      expect(result).toContain('bg-white');
      expect(result).toContain('bg-opacity-50');

      // Overriding background color should not affect background opacity
      const overriddenBg = mergeClasses('bg-white bg-opacity-50', 'bg-slate-900').split(' ');
      expect(overriddenBg).toContain('bg-slate-900');
      expect(overriddenBg).toContain('bg-opacity-50');
      expect(overriddenBg).not.toContain('bg-white');
    });

    it('should treat font weight, font family, and font style categories as distinct (Requirement 3)', () => {
      // Retaining font family, weight, and style simultaneously
      const result = mergeClasses('font-sans font-bold italic').split(' ');
      expect(result).toContain('font-sans');
      expect(result).toContain('font-bold');
      expect(result).toContain('italic');

      // Independently overriding each category
      const overridden = mergeClasses('font-sans font-bold italic', 'font-mono font-semibold not-italic').split(' ');
      expect(overridden).toContain('font-mono');
      expect(overridden).toContain('font-semibold');
      expect(overridden).toContain('not-italic');
      expect(overridden).not.toContain('font-sans');
      expect(overridden).not.toContain('font-bold');
      expect(overridden).not.toContain('italic');
    });

    it('should process border styles separate from border widths and border colors (Requirement 4)', () => {
      // Combining border width/presence and border style concurrently
      const result = mergeClasses('border border-dashed').split(' ');
      expect(result).toContain('border');
      expect(result).toContain('border-dashed');

      // Separating border styles from border colors and widths
      const overriddenStyle = mergeClasses('border border-slate-300 border-dashed', 'border-dotted').split(' ');
      expect(overriddenStyle).toContain('border');
      expect(overriddenStyle).toContain('border-slate-300');
      expect(overriddenStyle).toContain('border-dotted');
      expect(overriddenStyle).not.toContain('border-dashed');
    });
  });
});
