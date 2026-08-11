// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera } from './useCamera';

describe('useCamera Hook', () => {
  let originalMediaDevices: any;

  beforeEach(() => {
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: originalMediaDevices,
    });
    vi.restoreAllMocks();
  });

  it('should initialize with standard defaults', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.permissionState).toBe('prompt');
    expect(result.current.stream).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isInitializing).toBe(false);
  });

  it('should successfully acquire stream on startStream', async () => {
    const mockTracks = [{ stop: vi.fn() }];
    const mockStream = {
      getTracks: () => mockTracks,
    } as any;

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    let streamResult: MediaStream | null = null;
    await act(async () => {
      streamResult = await result.current.startStream();
    });

    expect(result.current.permissionState).toBe('granted');
    expect(result.current.stream).toBe(mockStream);
    expect(streamResult).toBe(mockStream);
    expect(result.current.error).toBeNull();
  });

  it('should handle permission denial gracefully without displaying console errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const permissionError = new DOMException('Permission denied', 'NotAllowedError');

    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permissionError);

    const { result } = renderHook(() => useCamera());

    let streamResult: MediaStream | null = null;
    await act(async () => {
      streamResult = await result.current.startStream();
    });

    expect(result.current.permissionState).toBe('denied');
    expect(result.current.stream).toBeNull();
    expect(streamResult).toBeNull();
    expect(result.current.error).toEqual(permissionError);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle general device unavailability gracefully', async () => {
    const otherError = new Error('Device not found');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(otherError);

    const { result } = renderHook(() => useCamera());

    let streamResult: MediaStream | null = null;
    await act(async () => {
      streamResult = await result.current.startStream();
    });

    expect(result.current.permissionState).toBe('unavailable');
    expect(result.current.stream).toBeNull();
    expect(streamResult).toBeNull();
    expect(result.current.error).toEqual(otherError);
  });

  it('should clean up stream tracks on stopStream', async () => {
    const stopMock = vi.fn();
    const mockTracks = [{ stop: stopMock }];
    const mockStream = {
      getTracks: () => mockTracks,
    } as any;

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startStream();
    });

    act(() => {
      result.current.stopStream();
    });

    expect(result.current.stream).toBeNull();
    expect(stopMock).toHaveBeenCalled();
  });
});
