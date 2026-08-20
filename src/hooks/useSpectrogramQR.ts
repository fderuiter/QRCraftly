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

import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { scheduleSpectrogramQR, bufferToWav } from '@/utils/spectrogramDspEngine';

const specColDuration = 0.25; // 250ms per column
const specMinFreq = 1200;      // lowest row frequency (Hz)
const specFreqSpacing = 80;   // Hz spacing per row module

/**
 * Custom hook for Spectrogram QR Art synthesis, real-time visual rendering, and offline WAV export.
 * @param getAudioContext Function to retrieve or initialize the active AudioContext.
 * @returns State, refs, and action handlers for Spectrogram QR Art.
 */
export function useSpectrogramQR(getAudioContext: () => AudioContext) {
  const [spectrogramText, setSpectrogramText] = useState('LISTEN');
  const [isPlayingSpectrogram, setIsPlayingSpectrogram] = useState(false);
  const [isGeneratingWav, setIsGeneratingWav] = useState(false);
  const [qrSize, setQrSize] = useState<number>(0);

  const specCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const specAnalyserRef = useRef<AnalyserNode | null>(null);
  const specAnimationRef = useRef<number | null>(null);
  const specOscillatorsRef = useRef<OscillatorNode[]>([]);
  const specGainNodesRef = useRef<GainNode[]>([]);

  const isPlayingRef = useRef(false);
  const isMountedRef = useRef(true);

  const stopSpectrogramQR = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlayingSpectrogram(false);

    specOscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch {}
    });
    specOscillatorsRef.current = [];
    specGainNodesRef.current = [];

    if (specAnimationRef.current !== null) {
      cancelAnimationFrame(specAnimationRef.current);
      specAnimationRef.current = null;
    }
  }, []);

  const startSpectrogramVisualizer = useCallback(
    (sizeParam: number) => {
      const canvas = specCanvasRef.current;
      const analyser = specAnalyserRef.current;
      if (!canvas || !analyser) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');

      const draw = () => {
        if (!specAnalyserRef.current || !isPlayingRef.current || !isMountedRef.current) {
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        if (tempCtx && ctx) {
          tempCtx.drawImage(canvas, 0, 0);
          ctx.drawImage(tempCanvas, -1.5, 0);
        }

        const audioCtx = getAudioContext();
        const binWidth = audioCtx.sampleRate / analyser.fftSize;

        const yMinFreq = specMinFreq - 100;
        const yMaxFreq = specMinFreq + sizeParam * specFreqSpacing + 100;

        for (let y = 0; y < height; y++) {
          const percent = 1 - y / height;
          const freq = yMinFreq + percent * (yMaxFreq - yMinFreq);
          const binIndex = Math.round(freq / binWidth);

          const intensity = dataArray[binIndex] || 0;

          if (intensity > 30) {
            ctx.fillStyle = `rgba(20, 184, 166, ${intensity / 255})`;
            ctx.fillRect(width - 2, y, 2, 1);
          } else {
            ctx.fillStyle = '#0a0f1d';
            ctx.fillRect(width - 2, y, 2, 1);
          }
        }

        if (isPlayingRef.current && isMountedRef.current) {
          specAnimationRef.current = requestAnimationFrame(draw);
        }
      };

      specAnimationRef.current = requestAnimationFrame(draw);
    },
    [getAudioContext]
  );

  const playSpectrogramQR = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      isPlayingRef.current = true;
      setIsPlayingSpectrogram(true);

      const qrObj = QRCode.create(spectrogramText, { errorCorrectionLevel: 'L' });
      const size = qrObj.modules.size;
      setQrSize(size);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.connect(ctx.destination);
      specAnalyserRef.current = analyser;

      const scheduled = scheduleSpectrogramQR(
        ctx,
        {
          size,
          get: (r, c) => Boolean(qrObj.modules.get(r, c)),
        },
        analyser,
        {
          specMinFreq,
          specFreqSpacing,
          specColDuration,
          startTime: ctx.currentTime + 0.2,
        }
      );

      specOscillatorsRef.current = scheduled.oscillators;
      specGainNodesRef.current = scheduled.gainNodes;

      startSpectrogramVisualizer(size);

      const totalDurationMs = (size * specColDuration + 0.3) * 1000;
      setTimeout(() => {
        if (isPlayingRef.current) {
          stopSpectrogramQR();
        }
      }, totalDurationMs);
    } catch (err: any) {
      alert(`Spectrogram synthesis failed: ${err.message}`);
      isPlayingRef.current = false;
      setIsPlayingSpectrogram(false);
    }
  }, [getAudioContext, spectrogramText, startSpectrogramVisualizer, stopSpectrogramQR]);

  const downloadSpectrogramWav = useCallback(async () => {
    try {
      setIsGeneratingWav(true);
      const qrObj = QRCode.create(spectrogramText, { errorCorrectionLevel: 'L' });
      const size = qrObj.modules.size;
      const totalDuration = size * specColDuration + 0.5;
      const sampleRate = 44100;

      const OfflineCtxClass =
        window.OfflineAudioContext || (window as any).OfflineAudioContext;
      const offlineCtx = new OfflineCtxClass(
        1,
        sampleRate * totalDuration,
        sampleRate
      );

      scheduleSpectrogramQR(
        offlineCtx,
        {
          size,
          get: (r, c) => Boolean(qrObj.modules.get(r, c)),
        },
        offlineCtx.destination,
        {
          specMinFreq,
          specFreqSpacing,
          specColDuration,
          startTime: 0.2,
        }
      );

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = bufferToWav(renderedBuffer);

      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-spectrogram-${spectrogramText.toLowerCase().replace(/[^a-z0-9]/g, '-')}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`WAV Generation failed: ${err.message}`);
    } finally {
      setIsGeneratingWav(false);
    }
  }, [spectrogramText]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpectrogramQR();
    };
  }, [stopSpectrogramQR]);

  return {
    spectrogramText,
    setSpectrogramText,
    isPlayingSpectrogram,
    isGeneratingWav,
    qrSize,
    specCanvasRef,
    playSpectrogramQR,
    stopSpectrogramQR,
    downloadSpectrogramWav,
  };
}
