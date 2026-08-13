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

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from './+Page';

// --- Mocks for Web Audio API ---
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
  getByteFrequencyData = vi.fn((array) => {
    // Fill array with some dummy data
    for (let i = 0; i < array.length; i++) {
      array[i] = 0;
    }
  });
}

class MockAudioContext {
  state = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  resume = vi.fn().mockImplementation(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  close = vi.fn().mockResolvedValue(undefined);
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
    getChannelData: vi.fn(() => new Float32Array(44100))
  });
}

describe('Acoustic Steganography & Audio QR Page', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('OfflineAudioContext', MockOfflineAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);

    // Mock HTML5 Canvas getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as any);

    // Mock getUserMedia
    const mockMediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [
          { stop: vi.fn() }
        ]
      })
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: mockMediaDevices
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with title, description and tabs', () => {
    render(<Page />);
    
    expect(screen.getByText('Acoustic Steganography & Audio QR')).toBeInTheDocument();
    expect(screen.getByText('1. Acoustic Modem (Chirp Transceiver)')).toBeInTheDocument();
    expect(screen.getByText('2. Spectrogram QR Art Generator')).toBeInTheDocument();
  });

  it('can type a message and trigger acoustic chirp transmission', () => {
    render(<Page />);
    
    const input = screen.getByLabelText('Message to Transmit (ASCII)');
    fireEvent.change(input, { target: { value: 'SOS' } });
    expect(input).toHaveValue('SOS');

    const transmitBtn = screen.getByRole('button', { name: /Transmit Chirp/i });
    fireEvent.click(transmitBtn);

    // Verify button transitions to Stop state
    expect(screen.getByRole('button', { name: /Stop Playback/i })).toBeInTheDocument();
  });

  it('can start and stop microphone listening receiver', async () => {
    render(<Page />);

    const listenBtn = screen.getByRole('button', { name: /Listen\/Receive/i });
    await act(async () => {
      fireEvent.click(listenBtn);
    });

    expect(screen.getByText('LISTENING')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop Listening/i })).toBeInTheDocument();

    const stopListenBtn = screen.getByRole('button', { name: /Stop Listening/i });
    fireEvent.click(stopListenBtn);
    expect(screen.queryByText('LISTENING')).not.toBeInTheDocument();
  });

  it('can switch tabs and use the Spectrogram QR Art features', async () => {
    render(<Page />);

    const spectrogramTabBtn = screen.getByText('2. Spectrogram QR Art Generator');
    fireEvent.click(spectrogramTabBtn);

    // Verify Tab 2 controls render
    expect(screen.getByLabelText('QR Payload String')).toBeInTheDocument();

    const playBtn = screen.getByRole('button', { name: /Play & Render/i });
    expect(playBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(playBtn);
    });

    // Check we entered drawing state
    expect(screen.getByText('DRAWING QR CODE')).toBeInTheDocument();

    // Trigger download WAV
    const downloadBtn = screen.getByRole('button', { name: /Export WAV/i });
    expect(downloadBtn).toBeInTheDocument();
  });
});
