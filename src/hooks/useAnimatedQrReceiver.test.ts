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
import { useAnimatedQrReceiver } from './useAnimatedQrReceiver';

describe('useAnimatedQrReceiver Hook', () => {
  let originalMediaDevices: any;

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'mock-download-url');
    global.URL.revokeObjectURL = vi.fn();

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
    vi.restoreAllMocks();
  });

  it('should initialize with standard defaults', () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    expect(result.current.chunks.size).toBe(0);
    expect(result.current.totalChunks).toBeNull();
    expect(result.current.securityAlert).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });

  it('should process simulated normal data frames', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    await act(async () => {
      await result.current.handleFrame('F|0|2|Zm9v');
    });

    expect(result.current.totalChunks).toBe(2);
    expect(result.current.chunks.get(0)).toBe('Zm9v');
  });

  it('should intercept dangerous schemes immediately', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    await act(async () => {
      await result.current.handleFrame('javascript:alert(1)');
    });

    expect(result.current.securityAlert).toContain('Dangerous protocol detected and blocked');
  });

  it('should compile and reassemble files via background worker', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    await act(async () => {
      await result.current.handleFrame('F|0|2|Zm9v');
    });

    await act(async () => {
      await result.current.handleFrame('F|1|2|YmFy');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.receiverSuccess).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should synchronously and atomically reset state and frame-tracking memory when a new file handshake with a different SHA-256 is detected', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    // 1. Process first file's handshake and first frame
    await act(async () => {
      await result.current.handleFrame('H|file1.txt|10|text/plain|sha111');
    });
    await act(async () => {
      await result.current.handleFrame('F|0|2|Zm9v');
    });

    expect(result.current.handshake?.sha256).toBe('sha111');
    expect(result.current.chunks.get(0)).toBe('Zm9v');
    expect(result.current.totalChunks).toBe(2);

    // 2. Process a different file handshake (different SHA-256)
    await act(async () => {
      await result.current.handleFrame('H|file2.txt|20|text/plain|sha222');
    });

    // Verify all states are atomically cleared/updated
    expect(result.current.handshake?.sha256).toBe('sha222');
    expect(result.current.handshake?.fileName).toBe('file2.txt');
    expect(result.current.chunks.size).toBe(0);
    expect(result.current.totalChunks).toBeNull();
    expect(result.current.receiverSuccess).toBe(false);

    // 3. Process first frame of new file (which has same index '0')
    // If memory wasn't reset, this would be discarded as a duplicate of the previous file's frame 0!
    await act(async () => {
      await result.current.handleFrame('F|0|2|YmFy');
    });

    expect(result.current.chunks.get(0)).toBe('YmFy');
    expect(result.current.totalChunks).toBe(2);
  });

  it('should reset the lookahead validation security engine concurrently with the frame cache', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver({ streamMode: 'text' }));

    // Send first handshake
    await act(async () => {
      await result.current.handleFrame('H|file1.txt|10|text/plain|sha111');
    });

    // Send a frame containing a partial dangerous protocol (e.g., 'java')
    // This doesn't trigger security alert yet because it doesn't match 'javascript:' completely
    await act(async () => {
      await result.current.handleFrame('java');
    });

    expect(result.current.securityAlert).toBeNull();

    // Now, send a different file handshake (this should reset/clear the lookahead buffer)
    await act(async () => {
      await result.current.handleFrame('H|file2.txt|20|text/plain|sha222');
    });

    // Send 'script:' which would have completed 'javascript:' if lookahead buffer wasn't cleared!
    await act(async () => {
      await result.current.handleFrame('script:');
    });

    // Verify no security alert was triggered, because lookahead buffer was reset
    expect(result.current.securityAlert).toBeNull();
  });

  it('should block split-payload attacks (e.g., java and script:) across frames immediately', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    // 'java' in base64 is 'amF2YQ=='
    await act(async () => {
      await result.current.handleFrame('F|0|2|amF2YQ==');
    });

    // 'script:alert(1)' in base64 is 'c2NyaXB0OmFsZXJ0KDEp'
    await act(async () => {
      await result.current.handleFrame('F|1|2|c2NyaXB0OmFsZXJ0KDEp');
    });

    expect(result.current.securityAlert).toContain('MaliciousStreamError: Detected dangerous protocol prefix "javascript:" split across frames.');
    expect(result.current.isScanning).toBe(false);
  });

  it('should not block legitimate QR codes containing standard data', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    // 'hello' in base64 is 'aGVsbG8='
    await act(async () => {
      await result.current.handleFrame('F|0|2|aGVsbG8=');
    });

    // ' world' in base64 is 'IHdvcmxk'
    await act(async () => {
      await result.current.handleFrame('F|1|2|IHdvcmxk');
    });

    expect(result.current.securityAlert).toBeNull();
  });

  it('should reject transfers exceeding 5,000 chunks', async () => {
    const { result } = renderHook(() => useAnimatedQrReceiver());

    await act(async () => {
      await result.current.handleFrame('F|0|5001|Zm9v');
    });

    expect(result.current.receiverError).toBe('File transfer rejected: exceeds the maximum limit of 5000 chunks.');
    expect(result.current.isScanning).toBe(false);
  });
});
