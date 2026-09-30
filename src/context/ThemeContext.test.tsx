import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initiallyDark: boolean) {
  const listeners = new Set<Listener>();
  const media = {
    matches: initiallyDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  return {
    setDark(dark: boolean) {
      media.matches = dark;
      listeners.forEach((cb) => cb({ matches: dark } as MediaQueryListEvent));
    },
  };
}

function Probe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setPreference('light')}>light</button>
    </div>
  );
}

const root = document.documentElement;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  root.classList.remove('dark');
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('restores a stored preference so the theme persists across routes and reloads', () => {
    mockMatchMedia(false);
    window.localStorage.setItem('qrcraftly:theme', 'dark');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(root).toHaveClass('dark');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('follows prefers-color-scheme in system mode, including live changes', () => {
    const media = mockMatchMedia(true);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('pref')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(root).toHaveClass('dark');

    act(() => media.setDark(false));
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(root).not.toHaveClass('dark');
  });

  it('does not clobber the pre-hydration theme before reading storage', () => {
    mockMatchMedia(false);
    window.localStorage.setItem('qrcraftly:theme', 'dark');
    root.classList.add('dark');
    const applied: boolean[] = [];
    const observer = new MutationObserver(() => applied.push(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    render(<ThemeProvider><Probe /></ThemeProvider>);
    observer.disconnect();
    expect(applied).not.toContain(false);
  });

  it('synchronises changes made in another tab', () => {
    mockMatchMedia(false);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'qrcraftly:theme', newValue: 'dark' }));
    });
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(root).toHaveClass('dark');
  });

  it('persists only the preference value under the allowlisted key', () => {
    mockMatchMedia(false);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => screen.getByRole('button', { name: 'light' }).click());
    expect(Object.keys(window.localStorage)).toEqual(['qrcraftly:theme']);
    expect(window.localStorage.getItem('qrcraftly:theme')).toBe('light');
  });

  it('keeps working when storage throws', () => {
    mockMatchMedia(false);
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => screen.getByRole('button', { name: 'light' }).click());
    expect(screen.getByTestId('pref')).toHaveTextContent('light');
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
