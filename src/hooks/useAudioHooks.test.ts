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

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAudioContext } from './useAudioContext';
import { useChirpTransceiver } from './useChirpTransceiver';
import { useSpectrogramQR } from './useSpectrogramQR';

class MockAudioParam {
  value = 0;
  setValueAtTime = vi.fn().mockReturnThis();
  linearRampToValueAtTime = vi.fn().mockReturnThis();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode extends MockAudioNode {
  frequency = new MockAudioParam();
  type = 'sine';
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockAnalyserNode extends MockAudioNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  frequencyBinCount = 1024;
  getByteFrequencyData = vi.fn();
}

class MockAudioContext {
  state = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  resume = vi.fn().mockImplementation(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  close = vi.fn().mockImplementation(() => {
    this.state = 'closed';
    return Promise.resolve();
  });
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  createMediaStreamSource = vi.fn(() => new MockAudioNode());
  destination = new MockAudioNode();
}

class MockOfflineAudioContext {
  destination = new MockAudioNode();
  sampleRate = 44100;
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  startRendering = vi.fn().mockResolvedValue({
    numberOfChannels: 1,
    length: 44100,
    sampleRate: 44100,
    getChannelData: vi.fn(() => new Float32Array(44100)),
  });
}

describe('Custom Audio Hooks', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('OfflineAudioContext', MockOfflineAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAudioContext', () => {
    it('initializes audio context and closes it on unmount', () => {
      const { result, unmount } = renderHook(() => useAudioContext());

      let ctx: AudioContext | null = null;
      act(() => {
        ctx = result.current.getAudioContext();
      });

      expect(ctx).not.toBeNull();
      expect(ctx!.resume).toHaveBeenCalled();

      const closeSpy = ctx!.close;
      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('useChirpTransceiver', () => {
    it('starts listening and immediately cleans up media tracks when stopped', async () => {
      const stopTrackMock = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: stopTrackMock }],
      };

      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
        },
      });

      const audioCtx = new MockAudioContext() as any;
      const { result } = renderHook(() => useChirpTransceiver(() => audioCtx));

      await act(async () => {
        await result.current.startChirpListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopChirpListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(stopTrackMock).toHaveBeenCalled();
    });

    it('rejects microphone stream if user toggles recording off before getUserMedia resolves (async race condition)', async () => {
      const stopTrackMock = vi.fn();
      let resolveGetUserMedia: (stream: any) => void = () => {};

      const pendingPromise = new Promise((resolve) => {
        resolveGetUserMedia = resolve;
      });

      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockReturnValue(pendingPromise),
        },
      });

      const audioCtx = new MockAudioContext() as any;
      const { result } = renderHook(() => useChirpTransceiver(() => audioCtx));

      let listenPromise: Promise<void> | null = null;
      act(() => {
        listenPromise = result.current.startChirpListening();
      });

      expect(result.current.isListening).toBe(true);

      // User toggles recording off BEFORE permission prompt resolves!
      act(() => {
        result.current.stopChirpListening();
      });

      expect(result.current.isListening).toBe(false);

      // Now permission prompt resolves
      await act(async () => {
        resolveGetUserMedia({
          getTracks: () => [{ stop: stopTrackMock }],
        });
        await listenPromise;
      });

      // Stream tracks MUST have been stopped immediately upon resolution!
      expect(stopTrackMock).toHaveBeenCalled();
      expect(result.current.micStreamRef.current).toBeNull();
    });

    it('stops microphone tracks on unmount if component unmounts while prompt is open', async () => {
      const stopTrackMock = vi.fn();
      let resolveGetUserMedia: (stream: any) => void = () => {};

      const pendingPromise = new Promise((resolve) => {
        resolveGetUserMedia = resolve;
      });

      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockReturnValue(pendingPromise),
        },
      });

      const audioCtx = new MockAudioContext() as any;
      const { result, unmount } = renderHook(() => useChirpTransceiver(() => audioCtx));

      let listenPromise: Promise<void> | null = null;
      act(() => {
        listenPromise = result.current.startChirpListening();
      });

      // Component unmounts while prompt is open!
      unmount();

      // Now permission prompt resolves
      await act(async () => {
        resolveGetUserMedia({
          getTracks: () => [{ stop: stopTrackMock }],
        });
        await listenPromise;
      });

      expect(stopTrackMock).toHaveBeenCalled();
    });

    it('processes messages received from fskDemodulatorWorker to update symbol and decoded message', async () => {
      const stopTrackMock = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: stopTrackMock }],
      };

      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
        },
      });

      const audioCtx = new MockAudioContext() as any;
      const { result } = renderHook(() => useChirpTransceiver(() => audioCtx));

      await act(async () => {
        await result.current.startChirpListening();
      });

      expect(result.current.isListening).toBe(true);

      const activeWorker = (globalThis as any).mockWorkerControl.activeWorker;
      expect(activeWorker).not.toBeNull();

      // Dispatch a worker response message
      act(() => {
        activeWorker.dispatchMessage({
          type: 'fsk_response',
          symbol: 'BIT 1',
          decodedMessage: 'HI',
          logs: ["Decoded Character: 'I'"],
          buffer: new ArrayBuffer(1024),
        });
      });

      expect(result.current.currentSymbol).toBe('BIT 1');
      expect(result.current.decodedMessage).toBe('HI');
      expect(result.current.receiverLog).toContain("Decoded Character: 'I'");

      act(() => {
        result.current.stopChirpListening();
      });
      expect(result.current.isListening).toBe(false);
    });

    it('registers all created oscillator and gain nodes and disconnects them when stopChirpTransmission is called', () => {
      const audioCtx = new MockAudioContext() as any;
      const createdOscs: MockOscillatorNode[] = [];
      const createdGains: MockGainNode[] = [];

      audioCtx.createOscillator = vi.fn(() => {
        const osc = new MockOscillatorNode();
        createdOscs.push(osc);
        return osc;
      });
      audioCtx.createGain = vi.fn(() => {
        const gain = new MockGainNode();
        createdGains.push(gain);
        return gain;
      });

      const { result } = renderHook(() => useChirpTransceiver(() => audioCtx));

      act(() => {
        result.current.setChirpText('HI');
        result.current.startChirpTransmission();
      });

      expect(result.current.isTransmitting).toBe(true);
      // 'HI' is 2 characters = 16 bits + 1 sync tone = 17 tones -> 17 oscillators and 17 gain nodes
      expect(createdOscs.length).toBe(17);
      expect(createdGains.length).toBe(17);

      act(() => {
        result.current.stopChirpTransmission();
      });

      expect(result.current.isTransmitting).toBe(false);
      createdOscs.forEach((osc) => {
        expect(osc.stop).toHaveBeenCalled();
        expect(osc.disconnect).toHaveBeenCalled();
      });
      createdGains.forEach((gain) => {
        expect(gain.disconnect).toHaveBeenCalled();
      });
    });

    it('disconnects all active oscillator and gain nodes on component unmount during transmission', () => {
      const audioCtx = new MockAudioContext() as any;
      const createdOscs: MockOscillatorNode[] = [];
      const createdGains: MockGainNode[] = [];

      audioCtx.createOscillator = vi.fn(() => {
        const osc = new MockOscillatorNode();
        createdOscs.push(osc);
        return osc;
      });
      audioCtx.createGain = vi.fn(() => {
        const gain = new MockGainNode();
        createdGains.push(gain);
        return gain;
      });

      const { result, unmount } = renderHook(() => useChirpTransceiver(() => audioCtx));

      act(() => {
        result.current.setChirpText('A');
        result.current.startChirpTransmission();
      });

      expect(result.current.isTransmitting).toBe(true);
      expect(createdOscs.length).toBeGreaterThan(0);
      expect(createdGains.length).toBeGreaterThan(0);

      unmount();

      createdOscs.forEach((osc) => {
        expect(osc.stop).toHaveBeenCalled();
        expect(osc.disconnect).toHaveBeenCalled();
      });
      createdGains.forEach((gain) => {
        expect(gain.disconnect).toHaveBeenCalled();
      });
    });

    it('disconnects all active oscillator and gain nodes when transmission completes automatically', () => {
      vi.useFakeTimers();
      try {
        const audioCtx = new MockAudioContext() as any;
        const createdOscs: MockOscillatorNode[] = [];
        const createdGains: MockGainNode[] = [];

        audioCtx.createOscillator = vi.fn(() => {
          const osc = new MockOscillatorNode();
          createdOscs.push(osc);
          return osc;
        });
        audioCtx.createGain = vi.fn(() => {
          const gain = new MockGainNode();
          createdGains.push(gain);
          return gain;
        });

        const { result } = renderHook(() => useChirpTransceiver(() => audioCtx));

        act(() => {
          result.current.setChirpText('OK');
          result.current.startChirpTransmission();
        });

        expect(result.current.isTransmitting).toBe(true);

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(result.current.isTransmitting).toBe(false);
        createdOscs.forEach((osc) => {
          expect(osc.disconnect).toHaveBeenCalled();
        });
        createdGains.forEach((gain) => {
          expect(gain.disconnect).toHaveBeenCalled();
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('useSpectrogramQR', () => {
    it('plays spectrogram QR art and stops correctly', async () => {
      const audioCtx = new MockAudioContext() as any;
      const { result } = renderHook(() => useSpectrogramQR(() => audioCtx));

      await act(async () => {
        await result.current.playSpectrogramQR();
      });

      expect(result.current.isPlayingSpectrogram).toBe(true);

      act(() => {
        result.current.stopSpectrogramQR();
      });

      expect(result.current.isPlayingSpectrogram).toBe(false);
    });

    it('renders offline WAV export using OfflineAudioContext', async () => {
      const audioCtx = new MockAudioContext() as any;
      const { result } = renderHook(() => useSpectrogramQR(() => audioCtx));

      // Mock URL.createObjectURL
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn(),
      });

      await act(async () => {
        await result.current.downloadSpectrogramWav();
      });

      expect(result.current.isGeneratingWav).toBe(false);
    });
  });
});
