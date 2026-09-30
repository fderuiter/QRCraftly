import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  nextThemePreference,
  parseThemePreference,
  resolveTheme,
} from '@/utils/theme';
import { ALLOWED_STORAGE_KEYS } from '../scripts/storage_privacy_ast_auditor.js';
import { computeCspHash, extractInlineScripts } from '../scripts/csp_hash_injector.js';

const root = document.documentElement;

function runInitScript() {
  new Function(THEME_INIT_SCRIPT)();
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  root.classList.remove('dark');
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
});

describe('theme helpers', () => {
  it('parses only known preferences', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('system')).toBe('system');
    expect(parseThemePreference('https://secret.example')).toBe('system');
    expect(parseThemePreference(null)).toBe('system');
  });

  it('resolves system against the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('cycles through all three preferences', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });

  it('uses a storage key that is on the storage allowlist', () => {
    expect(ALLOWED_STORAGE_KEYS.has(THEME_STORAGE_KEY)).toBe(true);
    expect(THEME_INIT_SCRIPT).toContain(`'${THEME_STORAGE_KEY}'`);
  });
});

describe('THEME_INIT_SCRIPT (pre-hydration)', () => {
  it('applies a stored dark theme before hydration', () => {
    window.localStorage.setItem('qrcraftly:theme', 'dark');
    runInitScript();
    expect(root).toHaveClass('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('follows prefers-color-scheme when no preference is stored', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    runInitScript();
    expect(root).toHaveClass('dark');
  });

  it('honours an explicit light preference over a dark system scheme', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    window.localStorage.setItem('qrcraftly:theme', 'light');
    runInitScript();
    expect(root).not.toHaveClass('dark');
    expect(root.style.colorScheme).toBe('light');
  });

  it('never throws when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(runInitScript).not.toThrow();
    spy.mockRestore();
  });

  it('is picked up and hashed by the CSP inline-script injector', () => {
    const html = `<html><head><script>${THEME_INIT_SCRIPT}</script><script type="application/ld+json">{}</script></head></html>`;
    const scripts = extractInlineScripts(html, true);
    expect(scripts).toEqual([THEME_INIT_SCRIPT]);
    expect(computeCspHash(THEME_INIT_SCRIPT)).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
  });
});
