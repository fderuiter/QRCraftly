import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { QRProvider, useQRStore } from '@/context/QRContext';
import { useTheme } from './useTheme';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QRProvider>{children}</QRProvider>
);

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns isDarkMode as false by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDarkMode).toBe(false);
  });

  it('toggleDarkMode switches isDarkMode from false to true', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDarkMode).toBe(false);
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(result.current.isDarkMode).toBe(true);
  });

  it('toggleDarkMode switches isDarkMode from true back to false', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(result.current.isDarkMode).toBe(true);
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(result.current.isDarkMode).toBe(false);
  });

  it('subsequent calls to toggleDarkMode alternate correctly', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.toggleDarkMode()); // true
    act(() => result.current.toggleDarkMode()); // false
    act(() => result.current.toggleDarkMode()); // true
    expect(result.current.isDarkMode).toBe(true);
  });

  it('isDarkMode reflects store state set externally', () => {
    // Use the store directly to set darkMode and verify useTheme picks it up
    const { result } = renderHook(
      () => ({
        theme: useTheme(),
        store: useQRStore(),
      }),
      { wrapper }
    );

    expect(result.current.theme.isDarkMode).toBe(false);
    act(() => {
      result.current.store.updatePreferences({ darkMode: true });
    });
    expect(result.current.theme.isDarkMode).toBe(true);
  });

  it('returns a toggleDarkMode function', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(typeof result.current.toggleDarkMode).toBe('function');
  });
});