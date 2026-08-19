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

import { describe, it, expect, vi } from 'vitest';
import { scheduleSpectrogramQR, bufferToWav } from './spectrogramDspEngine';

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

class MockContext {
  currentTime = 0;
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
}

describe('spectrogramDspEngine', () => {
  it('schedules oscillators and gain nodes according to unified formulas', () => {
    const ctx = new MockContext() as any;
    const destination = new MockAudioNode() as any;

    const mockMatrix = {
      size: 3,
      get: (r: number, c: number) => (r + c) % 2 === 0,
    };

    const scheduled = scheduleSpectrogramQR(ctx, mockMatrix, destination, {
      specMinFreq: 1200,
      specFreqSpacing: 80,
      specColDuration: 0.25,
      startTime: 0.2,
    });

    expect(scheduled.oscillators).toHaveLength(3);
    expect(scheduled.gainNodes).toHaveLength(3);

    // Verify node creation and connections
    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    expect(ctx.createGain).toHaveBeenCalledTimes(3);

    // Check frequency calculation: size - 1 - r -> r=0 gets highest freq (1200 + 2*80 = 1360)
    const firstOsc = scheduled.oscillators[0] as unknown as MockOscillatorNode;
    expect(firstOsc.frequency.setValueAtTime).toHaveBeenCalledWith(1360, 0.2);
    expect(firstOsc.start).toHaveBeenCalledWith(0.2);
    expect(firstOsc.stop).toHaveBeenCalledWith(0.2 + 3 * 0.25 + 0.1);
  });

  it('generates a valid 16-bit PCM WAV blob with 44-byte RIFF header', async () => {
    const channelData = new Float32Array(100);
    for (let i = 0; i < 100; i++) {
      channelData[i] = Math.sin(i * 0.1);
    }

    const mockAudioBuffer = {
      numberOfChannels: 1,
      length: 100,
      sampleRate: 44100,
      getChannelData: () => channelData,
    } as unknown as AudioBuffer;

    const wavBlob = bufferToWav(mockAudioBuffer);

    expect(wavBlob).toBeInstanceOf(Blob);
    expect(wavBlob.type).toBe('audio/wav');

    // Total size should be 100 samples * 1 channel * 2 bytes + 44 RIFF header bytes = 244
    expect(wavBlob.size).toBe(244);

    const bufferArr = await wavBlob.arrayBuffer();
    const view = new DataView(bufferArr);

    // Check "RIFF" chunk
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    expect(riff).toBe('RIFF');

    // Check "WAVE" format
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    );
    expect(wave).toBe('WAVE');

    // Check "fmt " subchunk
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15)
    );
    expect(fmt).toBe('fmt ');

    // Check PCM audio format = 1
    expect(view.getUint16(20, true)).toBe(1);

    // Check numChannels = 1
    expect(view.getUint16(22, true)).toBe(1);

    // Check sampleRate = 44100
    expect(view.getUint32(24, true)).toBe(44100);

    // Check "data" subchunk
    const dataChunk = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39)
    );
    expect(dataChunk).toBe('data');
  });
});
