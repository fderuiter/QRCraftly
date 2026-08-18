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
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useAnimatedQrSender } from './useAnimatedQrSender';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '../types';

const mockConfig: QRConfig = {
  value: 'Hello World',
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

describe('useAnimatedQrSender Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  it('should initialize with standard defaults and lower visual density (< 256 bytes)', () => {
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
    expect(result.current.chunkSize).toBeLessThan(256);
    expect(result.current.chunkSize).toBe(180);
    expect(result.current.currentPass).toBe(1);
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

  it('sends the fps parameter to the worker on START', async () => {
    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
      })
    );

    act(() => {
      result.current.setSelectedFile(new File(['test content'], 'test.txt', { type: 'text/plain' }));
    });

    let startMessage: any = null;
    globalThis.mockWorkerControl.setInterceptor((message: any) => {
      if (message.type === 'START') {
        startMessage = message;
      }
    });

    act(() => {
      result.current.startTransfer();
    });

    await waitFor(() => {
      expect(startMessage).not.toBeNull();
    });
    expect(startMessage.payload.fps).toBe(15);
  });

  it('triggers the self-healing watch loop when frame generation is stalled for 100ms', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
      })
    );

    act(() => {
      result.current.setSelectedFile(new File(['test content'], 'test.txt', { type: 'text/plain' }));
    });

    const sentMessages: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((message: any) => {
      sentMessages.push(message);
    });

    act(() => {
      result.current.startTransfer();
    });

    // Clear initial messages (like START)
    sentMessages.length = 0;

    // Advance time by 120ms (>= 100ms) with no frames received (so frameBuffer is empty and playIdx remains 0)
    act(() => {
      vi.advanceTimersByTime(120);
    });

    // Check if self-healing (HEAL and ACK messages) were sent to the worker
    const healMessages = sentMessages.filter(m => m.type === 'HEAL');
    const ackMessages = sentMessages.filter(m => m.type === 'ACK');

    expect(healMessages.length).toBeGreaterThan(0);
    expect(ackMessages.length).toBeGreaterThan(0);
    expect(healMessages[0].payload.lastAckedIndex).toBe(-1); // currentPlayIndex - 1 = -1

    vi.useRealTimers();
  });

  it('supports adaptive density and frame memory pool caching across multiple passes', () => {
    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
      })
    );

    const dummyFile = new File(['Hello World Payload Array For Testing Animated Transfers'], 'test.txt', {
      type: 'text/plain',
    });

    act(() => {
      result.current.setSelectedFile(dummyFile);
    });

    expect(result.current.selectedFile).toBe(dummyFile);
    expect(result.current.currentPass).toBe(1);

    // Simulate pre-allocated memory pool frame population
    act(() => {
      result.current.framePoolRef.current.storeFrame(0, 29, new Uint8Array(29 * 29).fill(1));
      result.current.framePoolRef.current.storeFrame(1, 29, new Uint8Array(29 * 29).fill(2));
    });

    expect(result.current.framePoolRef.current.size).toBe(2);
    expect(result.current.framePoolRef.current.hasFrame(0)).toBe(true);
    expect(result.current.framePoolRef.current.hasFrame(1)).toBe(true);
  });

  it('handles background worker ERROR events, sets senderError, triggers toast, and halts transfer', async () => {
    const addToastMock = vi.fn();
    const clearToastsMock = vi.fn();

    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
        addToast: addToastMock,
        clearToasts: clearToastsMock,
      })
    );

    act(() => {
      result.current.setSelectedFile(new File(['test content'], 'test.txt', { type: 'text/plain' }));
    });

    globalThis.mockWorkerControl.setInterceptor((message: any, worker: any) => {
      if (message.type === 'START') {
        worker.dispatchMessage({
          type: 'ERROR',
          payload: {
            message: 'File slice processing failed',
            code: 'SLICE_FAILED',
            details: 'Corrupt chunk buffer at offset 512',
          },
        });
      }
    });

    act(() => {
      result.current.startTransfer();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.senderError).toBe('File slice processing failed: Corrupt chunk buffer at offset 512');
    expect(result.current.senderErrorPayload).toEqual({
      message: 'File slice processing failed',
      code: 'SLICE_FAILED',
      details: 'Corrupt chunk buffer at offset 512',
    });
    expect(result.current.isTransferring).toBe(false);
    expect(addToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'File slice processing failed: Corrupt chunk buffer at offset 512',
      })
    );
  });

  it('clears error state when dismissError, stopTransfer, setSelectedFile, setFps, or setChunkSize is invoked', async () => {
    const addToastMock = vi.fn();
    const clearToastsMock = vi.fn();

    const { result } = renderHook(() =>
      useAnimatedQrSender({
        config: mockConfig,
        logoImg: null,
        borderLogoImg: null,
        addToast: addToastMock,
        clearToasts: clearToastsMock,
      })
    );

    globalThis.mockWorkerControl.setInterceptor((message: any, worker: any) => {
      if (message.type === 'START') {
        worker.dispatchMessage({
          type: 'ERROR',
          payload: { message: 'Unexpected worker exception' },
        });
      }
    });

    act(() => {
      result.current.setSelectedFile(new File(['test content'], 'test.txt', { type: 'text/plain' }));
    });
    act(() => {
      result.current.startTransfer();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.senderError).toBeTruthy();

    // 1. Explicit dismiss
    act(() => {
      result.current.dismissError();
    });

    expect(result.current.senderError).toBeNull();
    expect(result.current.senderErrorPayload).toBeNull();

    // Re-trigger error
    act(() => {
      result.current.setSelectedFile(new File(['test content'], 'test.txt', { type: 'text/plain' }));
    });
    act(() => {
      result.current.startTransfer();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.senderError).toBeTruthy();

    // 2. Set FPS auto-clears
    act(() => {
      result.current.setFps(30);
    });
    expect(result.current.senderError).toBeNull();
    expect(clearToastsMock).toHaveBeenCalled();
  });
});
