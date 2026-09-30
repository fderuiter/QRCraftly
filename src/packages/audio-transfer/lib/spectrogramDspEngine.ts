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

/**
 * Options for scheduling spectrogram QR synthesis.
 */
export interface SpectrogramDspOptions {
  specMinFreq?: number;
  specFreqSpacing?: number;
  specColDuration?: number;
  startTime?: number;
}

/**
 * Matrix interface representing dark/light QR modules.
 */
export interface SpectrogramModuleMatrix {
  size: number;
  get: (row: number, col: number) => boolean;
}

/**
 * Handle containing scheduled Web Audio nodes for spectrogram playback.
 */
export interface ScheduledNodes {
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
}

/**
 * Schedules spectrogram QR audio synthesis on any BaseAudioContext (AudioContext or OfflineAudioContext).
 * Uses a single unified formula for live playback and offline WAV export.
 * @param ctx The AudioContext or OfflineAudioContext.
 * @param matrix The QR code module matrix.
 * @param destination Target AudioNode to connect the generated signal.
 * @param options Optional DSP parameters (frequencies, durations, start offsets).
 * @returns Object containing arrays of created OscillatorNodes and GainNodes.
 */
export function scheduleSpectrogramQR(
  ctx: BaseAudioContext,
  matrix: SpectrogramModuleMatrix,
  destination: AudioNode,
  options: SpectrogramDspOptions = {}
): ScheduledNodes {
  const specMinFreq = options.specMinFreq ?? 1200;
  const specFreqSpacing = options.specFreqSpacing ?? 80;
  const specColDuration = options.specColDuration ?? 0.25;
  const startTime = options.startTime ?? 0.2;

  const size = matrix.size;
  const oscillators: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];

  for (let r = 0; r < size; r++) {
    const freq = specMinFreq + (size - 1 - r) * specFreqSpacing;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    osc.connect(gainNode);
    gainNode.connect(destination);

    gainNode.gain.setValueAtTime(0, startTime);

    for (let c = 0; c < size; c++) {
      const isDark = matrix.get(r, c);
      const colStartTime = startTime + c * specColDuration;
      const colEndTime = colStartTime + specColDuration;
      const targetGain = isDark ? 0.25 / size : 0.0;

      gainNode.gain.setValueAtTime(gainNode.gain.value, colStartTime);
      gainNode.gain.linearRampToValueAtTime(targetGain, colStartTime + 0.01);
      gainNode.gain.setValueAtTime(targetGain, colEndTime - 0.01);
      gainNode.gain.linearRampToValueAtTime(0, colEndTime);
    }

    osc.start(startTime);
    osc.stop(startTime + size * specColDuration + 0.1);

    oscillators.push(osc);
    gainNodes.push(gainNode);
  }

  return { oscillators, gainNodes };
}

/**
 * Converts an AudioBuffer to a 16-bit PCM WAV Blob with a 44-byte RIFF header.
 * @param buffer The rendered AudioBuffer from OfflineAudioContext.
 * @returns A WAV Blob with audio/wav mime type.
 */
export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // chunk length
  setUint16(1);          // sample format (raw PCM)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16);         // bits per sample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}
