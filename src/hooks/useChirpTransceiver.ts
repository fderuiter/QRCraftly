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

// Frequency mapping parameters
const SYNC_FREQ = 1500;
const ZERO_FREQ = 1200;
const ONE_FREQ = 2200;
const BIT_DURATION = 0.10; // 100ms per bit
const GAP_DURATION = 0.03; // 30ms silent gap

/**
 * Custom hook to manage acoustic modem (chirp transmission and receiving) lifecycle and hardware cleanup.
 * @param getAudioContext Function to retrieve or initialize the active AudioContext.
 * @returns State and control handlers for chirp transceiver.
 */
export function useChirpTransceiver(getAudioContext: () => AudioContext) {
  const [chirpText, setChirpText] = useState('HI');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState('');
  const [receiverLog, setReceiverLog] = useState<string[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<string>('Idle');

  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const rxAnimationRef = useRef<number | null>(null);

  const fskWorkerRef = useRef<Worker | null>(null);
  const bufferPoolRef = useRef<ArrayBuffer[]>([]);
  const isWorkerBusyRef = useRef<boolean>(false);

  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);

  const logMessage = useCallback((msg: string) => {
    setReceiverLog((prev) => [msg, ...prev].slice(0, 50));
  }, []);

  const stopChirpTransmission = useCallback(() => {
    activeOscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch {}
    });
    activeOscillatorsRef.current = [];
    setIsTransmitting(false);
    logMessage('Acoustic transmission stopped manually.');
  }, [logMessage]);

  const stopChirpListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setCurrentSymbol('Idle');

    if (rxAnimationRef.current !== null) {
      cancelAnimationFrame(rxAnimationRef.current);
      rxAnimationRef.current = null;
    }

    if (fskWorkerRef.current) {
      fskWorkerRef.current.terminate();
      fskWorkerRef.current = null;
    }
    bufferPoolRef.current = [];
    isWorkerBusyRef.current = false;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }

    micAnalyserRef.current = null;
    logMessage('Receiver deactivated.');
  }, [logMessage]);

  const startChirpTransmission = useCallback(() => {
    try {
      const ctx = getAudioContext();
      setIsTransmitting(true);
      logMessage('Starting acoustic transmission...');

      let binaryString = '';
      for (let i = 0; i < chirpText.length; i++) {
        const charCode = chirpText.charCodeAt(i);
        const bin = charCode.toString(2).padStart(8, '0');
        binaryString += bin;
      }

      logMessage(`Payload: "${chirpText}" -> Binary: ${binaryString}`);

      let time = ctx.currentTime + 0.1;

      // 1. Play Sync Tone
      const syncOsc = ctx.createOscillator();
      const syncGain = ctx.createGain();
      syncOsc.frequency.setValueAtTime(SYNC_FREQ, time);
      syncGain.gain.setValueAtTime(0, time);
      syncGain.gain.linearRampToValueAtTime(0.15, time + 0.02);
      syncGain.gain.setValueAtTime(0.15, time + 0.28);
      syncGain.gain.linearRampToValueAtTime(0, time + 0.30);

      syncOsc.connect(syncGain);
      syncGain.connect(ctx.destination);
      syncOsc.start(time);
      syncOsc.stop(time + 0.30);
      activeOscillatorsRef.current.push(syncOsc);

      time += 0.30;

      // 2. Play Bits with guard gaps
      for (let i = 0; i < binaryString.length; i++) {
        const bit = binaryString[i];
        const freq = bit === '1' ? ONE_FREQ : ZERO_FREQ;

        time += GAP_DURATION;

        const bitOsc = ctx.createOscillator();
        const bitGain = ctx.createGain();
        bitOsc.frequency.setValueAtTime(freq, time);

        bitGain.gain.setValueAtTime(0, time);
        bitGain.gain.linearRampToValueAtTime(0.15, time + 0.01);
        bitGain.gain.setValueAtTime(0.15, time + BIT_DURATION - 0.01);
        bitGain.gain.linearRampToValueAtTime(0, time + BIT_DURATION);

        bitOsc.connect(bitGain);
        bitGain.connect(ctx.destination);
        bitOsc.start(time);
        bitOsc.stop(time + BIT_DURATION);
        activeOscillatorsRef.current.push(bitOsc);

        time += BIT_DURATION;
      }

      const totalDurationMs = (time - ctx.currentTime) * 1000;
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsTransmitting(false);
          logMessage('Acoustic transmission finished successfully.');
        }
      }, totalDurationMs + 100);
    } catch (err: any) {
      logMessage(`Transmission Error: ${err.message}`);
      setIsTransmitting(false);
    }
  }, [chirpText, getAudioContext, logMessage]);

  const startChirpListening = useCallback(async () => {
    try {
      isListeningRef.current = true;
      setIsListening(true);
      setDecodedMessage('');
      setReceiverLog([]);
      logMessage('Microphone active. Listening for sync tone...');

      const ctx = getAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Async Permission Prompt Race Condition Guard:
      // If listening was toggled off or component unmounted while prompt was open, reject and stop tracks immediately.
      if (!isListeningRef.current || !isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      micStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      if (fskWorkerRef.current) {
        fskWorkerRef.current.terminate();
      }

      const worker = new Worker(
        new URL('../utils/fskDemodulatorWorker.ts', import.meta.url),
        { type: 'module' }
      );
      fskWorkerRef.current = worker;
      bufferPoolRef.current = [];
      isWorkerBusyRef.current = false;

      worker.postMessage({
        type: 'init',
        sampleRate: ctx.sampleRate,
        fftSize: analyser.fftSize,
      });

      worker.onmessage = (e: MessageEvent) => {
        if (!isListeningRef.current || !isMountedRef.current) return;
        const data = e.data;
        if (data && data.type === 'fsk_response') {
          if (data.symbol) {
            setCurrentSymbol(data.symbol);
          }
          if (data.decodedMessage !== undefined) {
            setDecodedMessage(data.decodedMessage);
          }
          if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
            setReceiverLog((prev) => [...data.logs.slice().reverse(), ...prev].slice(0, 50));
          }
          if (data.buffer instanceof ArrayBuffer) {
            bufferPoolRef.current.push(data.buffer);
          }
          isWorkerBusyRef.current = false;
        }
      };

      const bufferLength = analyser.frequencyBinCount;

      const decodeLoop = () => {
        if (!micAnalyserRef.current || !isListeningRef.current || !isMountedRef.current || !fskWorkerRef.current) {
          return;
        }

        if (!isWorkerBusyRef.current) {
          let buffer = bufferPoolRef.current.pop();
          if (!buffer || buffer.byteLength !== bufferLength) {
            buffer = new ArrayBuffer(bufferLength);
          }

          const dataArray = new Uint8Array(buffer);
          analyser.getByteFrequencyData(dataArray);

          isWorkerBusyRef.current = true;

          fskWorkerRef.current.postMessage(
            {
              type: 'process',
              buffer: dataArray.buffer,
            },
            [dataArray.buffer]
          );
        }

        if (isListeningRef.current && isMountedRef.current) {
          rxAnimationRef.current = requestAnimationFrame(decodeLoop);
        }
      };

      rxAnimationRef.current = requestAnimationFrame(decodeLoop);
    } catch (err: any) {
      logMessage(`Microphone Access Denied/Error: ${err.message}`);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [getAudioContext, logMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isListeningRef.current = false;
      stopChirpTransmission();
      stopChirpListening();
    };
  }, [stopChirpTransmission, stopChirpListening]);

  return {
    chirpText,
    setChirpText,
    isTransmitting,
    isListening,
    decodedMessage,
    receiverLog,
    currentSymbol,
    startChirpTransmission,
    stopChirpTransmission,
    startChirpListening,
    stopChirpListening,
    micStreamRef,
  };
}
