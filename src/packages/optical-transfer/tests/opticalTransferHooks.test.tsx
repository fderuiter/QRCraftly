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
import { useOpticalSender, useOpticalReceiver } from '../client';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '@/types';

const mockConfig: QRConfig = {
  value: 'Hello',
  type: QRType.TEXT,
  fgColor: '#000000',
  bgColor: '#ffffff',
  style: QRStyle.STANDARD,
  logoUrl: null,
  logoSize: 0.2,
  logoPaddingStyle: 'none',
  logoPadding: 1,
  logoBackgroundColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: QRErrorCorrectionLevel.M,
  isBorderEnabled: false,
  borderSize: 0.05,
  borderColor: '#000000',
  borderStyle: 'solid',
  borderText: '',
  borderTextPosition: 'bottom-center',
  borderTextColor: '#ffffff',
  borderLogoUrl: null,
  borderLogoPosition: 'bottom-center',
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
  templateHeadline: '',
  templateSubtext: '',
  templateQrScale: 1.0,
};

describe('Optical Transfer Client Hooks', () => {
  describe('useOpticalSender', () => {
    it('should initialize with default states', () => {
      const { result } = renderHook(() =>
        useOpticalSender({
          config: mockConfig,
          logoImg: null,
          borderLogoImg: null,
        })
      );

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.isTransferring).toBe(false);
      expect(result.current.isVerifyingHandshake).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.chunkSize).toBe(180);
      expect(result.current.fps).toBe(15);
    });

    it('should simulate 50MB file correctly', () => {
      const { result } = renderHook(() =>
        useOpticalSender({
          config: mockConfig,
          logoImg: null,
          borderLogoImg: null,
        })
      );

      act(() => {
        result.current.simulate50MBFile();
      });

      expect(result.current.selectedFile).not.toBeNull();
      expect(result.current.selectedFile?.name).toBe('simulated_50mb_file.bin');
      expect(result.current.selectedFile?.size).toBe(50 * 1024 * 1024);
    });
  });

  describe('useOpticalReceiver', () => {
    let originalMediaDevices: any;

    beforeEach(() => {
      originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        configurable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
        },
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        configurable: true,
        value: originalMediaDevices,
      });
    });

    it('should initialize with standard defaults', () => {
      const { result } = renderHook(() => useOpticalReceiver());

      expect(result.current.chunks.size).toBe(0);
      expect(result.current.totalChunks).toBeNull();
      expect(result.current.securityAlert).toBeNull();
      expect(result.current.isScanning).toBe(false);
      expect(result.current.receiverMode).toBe('camera');
    });

    it('should reset receiver state cleanly', () => {
      const { result } = renderHook(() => useOpticalReceiver());

      act(() => {
        result.current.resetReceiver();
      });

      expect(result.current.chunks.size).toBe(0);
      expect(result.current.totalChunks).toBeNull();
      expect(result.current.handshake).toBeNull();
      expect(result.current.receiverError).toBeNull();
    });
  });
});

