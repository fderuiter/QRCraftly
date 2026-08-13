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

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useAnimatedQrSender } from './useAnimatedQrSender';
import { QRConfig } from '../types';

const mockConfig: QRConfig = {
  type: 'TEXT',
  text: 'Hello World',
  foreground: '#000000',
  background: '#ffffff',
  errorCorrectionLevel: 'M',
  patternStyle: 'standard',
  eyeStyle: 'standard',
  eyeColor: '#000000',
  logoUrl: null,
  logoPaddingStyle: 'none',
  logoOpacity: 1,
  logoSize: 20,
  logoX: 0,
  logoY: 0,
  isBorderEnabled: false,
  borderWidth: 0,
  borderLogoUrl: null,
  templateStyle: 'none',
  socialFormat: '1:1',
};

describe('useAnimatedQrSender Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  it('should initialize with standard defaults', () => {
    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
      })
    );

    expect(result.current.selectedFile).toBeNull();
    expect(result.current.isTransferring).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.fps).toBe(15);
    expect(result.current.chunkSize).toBe(256);
  });

  it('should handle simulated 50MB file selection', () => {
    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
      })
    );

    act(() => {
      result.current.simulate50MBFile();
    });

    expect(result.current.selectedFile).not.toBeNull();
    expect(result.current.selectedFile?.name).toBe('simulation_50mb_payload.bin');
    expect(result.current.selectedFile?.size).toBe(50 * 1024 * 1024);
  });
});
