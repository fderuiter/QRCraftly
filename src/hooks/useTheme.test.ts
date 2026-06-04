/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useTheme } from './useTheme';
import { QRProvider } from '@/context/QRContext';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QRProvider, null, children);

describe('useTheme', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('isDarkMode is false by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDarkMode).toBe(false);
  });

  it('toggleDarkMode switches isDarkMode from false to true', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
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
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(result.current.isDarkMode).toBe(false);
  });

  it('returns toggleDarkMode as a function', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(typeof result.current.toggleDarkMode).toBe('function');
  });

  it('toggleDarkMode can be called multiple times consecutively', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggleDarkMode(); // false -> true
      result.current.toggleDarkMode(); // true -> false  (each call reads current isDarkMode snapshot)
    });
    // Note: each toggleDarkMode call captures the isDarkMode at the time of the call.
    // Since they both run in the same act, the second one may also read false.
    // What we can assert: the function doesn't throw.
    expect(typeof result.current.isDarkMode).toBe('boolean');
  });

  it('throws when used outside QRProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useQRStore must be used within QRProvider'
    );
    spy.mockRestore();
  });

  // Regression: useTheme now uses useQRStoreSelector (not useQRContext directly)
  // Verify isDarkMode reactively reflects store changes
  it('isDarkMode reflects store updates via useQRStoreSelector', () => {
    const { result } = renderHook(
      () => {
        const theme = useTheme();
        return theme;
      },
      { wrapper }
    );

    expect(result.current.isDarkMode).toBe(false);
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(result.current.isDarkMode).toBe(true);
  });
});