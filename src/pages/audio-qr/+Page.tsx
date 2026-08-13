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

import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Volume2, 
  Mic, 
  Music, 
  Play, 
  Square, 
  Download, 
  Sliders, 
  Sun, 
  Moon, 
  QrCode, 
  Info, 
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { QRProvider } from '@/context/QRContext';

// WAV header generation helper for client-side audio download
function bufferToWav(buffer: AudioBuffer): Blob {
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

/**
 * Acoustic Steganography & Audio QR Code page
 */
function AudioQRToolInner() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'chirp' | 'spectrogram'>('chirp');

  // --- Common Audio Context refs ---
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  // ==========================================
  // TAB 1: ACOUSTIC CHIRP STEGANOGRAPHY STATE
  // ==========================================
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

  // Frequency mapping parameters
  const SYNC_FREQ = 1500;
  const ZERO_FREQ = 1200;
  const ONE_FREQ = 2200;
  const BIT_DURATION = 0.10; // 100ms per bit
  const GAP_DURATION = 0.03; // 30ms silent gap

  // Add message to receiver logs
  const logMessage = (msg: string) => {
    setReceiverLog(prev => [msg, ...prev].slice(0, 50));
  };

  // --- Chirp Transmitter ---
  const startChirpTransmission = () => {
    try {
      const ctx = getAudioContext();
      setIsTransmitting(true);
      logMessage("Starting acoustic transmission...");

      // Convert text to binary string (8 bits per character)
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

        // Gap phase
        time += GAP_DURATION;

        // Bit tone phase
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

      // Automatically reset status after transmission completes
      const totalDurationMs = (time - ctx.currentTime) * 1000;
      setTimeout(() => {
        setIsTransmitting(false);
        logMessage("Acoustic transmission finished successfully.");
      }, totalDurationMs + 100);

    } catch (err: any) {
      logMessage(`Transmission Error: ${err.message}`);
      setIsTransmitting(false);
    }
  };

  const stopChirpTransmission = () => {
    activeOscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    activeOscillatorsRef.current = [];
    setIsTransmitting(false);
    logMessage("Acoustic transmission stopped manually.");
  };

  // --- Chirp Receiver ---
  const startChirpListening = async () => {
    try {
      const ctx = getAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setIsListening(true);
      setDecodedMessage('');
      setReceiverLog([]);
      logMessage("Microphone active. Listening for sync tone...");

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      // Receiver State Machine Variables
      let isReceiving = false;
      let bitBuffer: string[] = [];
      let currentBitStream = '';
      let expectingBit = true;
      let lastDecodedTime = 0;

      const binWidth = ctx.sampleRate / analyser.fftSize;
      const syncBin = Math.round(SYNC_FREQ / binWidth);
      const zeroBin = Math.round(ZERO_FREQ / binWidth);
      const oneBin = Math.round(ONE_FREQ / binWidth);

      const minSearchBin = Math.round(900 / binWidth);
      const maxSearchBin = Math.round(2500 / binWidth);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const decodeLoop = () => {
        if (!micAnalyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Find peak frequency in our communication band
        let maxVal = 0;
        let peakBin = -1;
        for (let b = minSearchBin; b <= maxSearchBin; b++) {
          if (dataArray[b] > maxVal) {
            maxVal = dataArray[b];
            peakBin = b;
          }
        }

        const now = Date.now();
        const amplitudeThreshold = 135; // Squelch threshold

        if (maxVal > amplitudeThreshold && peakBin !== -1) {
          // Check closest bin matching
          const distSync = Math.abs(peakBin - syncBin);
          const distZero = Math.abs(peakBin - zeroBin);
          const distOne = Math.abs(peakBin - oneBin);

          const minDistance = Math.min(distSync, distZero, distOne);
          const tolerance = 4; // bin tolerance

          if (minDistance <= tolerance) {
            if (minDistance === distSync) {
              setCurrentSymbol('SYNC TONE');
              if (!isReceiving && now - lastDecodedTime > 1000) {
                isReceiving = true;
                bitBuffer = [];
                currentBitStream = '';
                expectingBit = true;
                lastDecodedTime = now;
                logMessage("⚡ Sync tone detected! Initializing receiver matrix...");
              }
            } else if (isReceiving && expectingBit && now - lastDecodedTime > 80) {
              if (minDistance === distZero) {
                setCurrentSymbol('BIT 0');
                bitBuffer.push('0');
                lastDecodedTime = now;
                expectingBit = false;
                logMessage("Decoded bit: 0");
              } else if (minDistance === distOne) {
                setCurrentSymbol('BIT 1');
                bitBuffer.push('1');
                lastDecodedTime = now;
                expectingBit = false;
                logMessage("Decoded bit: 1");
              }

              // Check if we have complete bytes (8 bits)
              if (bitBuffer.length >= 8) {
                const byteString = bitBuffer.join('');
                const charCode = parseInt(byteString, 2);
                const char = String.fromCharCode(charCode);
                currentBitStream += char;
                setDecodedMessage(currentBitStream);
                logMessage(`📥 Decoded Character: '${char}' (Hex: ${charCode.toString(16).toUpperCase()})`);
                bitBuffer = [];
              }
            }
          } else {
            setCurrentSymbol('Noise / Unrecognized');
          }
        } else {
          setCurrentSymbol('Silence / Gap');
          // We transitioned to gap, so allow next bit to be read
          if (!expectingBit && now - lastDecodedTime > 40) {
            expectingBit = true;
          }
        }

        rxAnimationRef.current = requestAnimationFrame(decodeLoop);
      };

      rxAnimationRef.current = requestAnimationFrame(decodeLoop);

    } catch (err: any) {
      logMessage(`Microphone Access Denied/Error: ${err.message}`);
      setIsListening(false);
    }
  };

  const stopChirpListening = () => {
    setIsListening(false);
    setCurrentSymbol('Idle');
    if (rxAnimationRef.current) {
      cancelAnimationFrame(rxAnimationRef.current);
      rxAnimationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    micAnalyserRef.current = null;
    logMessage("Receiver deactivated.");
  };


  // ==========================================
  // TAB 2: SPECTROGRAM QR ART STATE
  // ==========================================
  const [spectrogramText, setSpectrogramText] = useState('LISTEN');
  const [isPlayingSpectrogram, setIsPlayingSpectrogram] = useState(false);
  const [isGeneratingWav, setIsGeneratingWav] = useState(false);
  const [qrSize, setQrSize] = useState<number>(0);

  const specCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const specAnalyserRef = useRef<AnalyserNode | null>(null);
  const specAnimationRef = useRef<number | null>(null);
  const specOscillatorsRef = useRef<OscillatorNode[]>([]);
  const specGainNodesRef = useRef<GainNode[]>([]);

  // Synthesizer parameters
  const specColDuration = 0.25; // 250ms per column
  const specMinFreq = 1200;      // lowest row frequency (Hz)
  const specFreqSpacing = 80;   // Hz spacing per row module

  // --- Spectrogram Sound Generator & Scheduler ---
  const playSpectrogramQR = async () => {
    try {
      const ctx = getAudioContext();
      setIsPlayingSpectrogram(true);

      // 1. Generate QR Code module matrix
      const qrObj = QRCode.create(spectrogramText, { errorCorrectionLevel: 'L' });
      const size = qrObj.modules.size;
      setQrSize(size);

      // 2. Set up real-time Analyser node for our canvas rendering
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.connect(ctx.destination);
      specAnalyserRef.current = analyser;

      const startTime = ctx.currentTime + 0.2;

      // 3. For each row r, create an oscillator & gain node
      // Row N-1 is bottom (lowest freq), Row 0 is top (highest freq)
      for (let r = 0; r < size; r++) {
        const freq = specMinFreq + (size - 1 - r) * specFreqSpacing;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Connect nodes
        osc.connect(gainNode);
        gainNode.connect(analyser);

        // Schedule gains based on QR modules
        // Initialize at 0
        gainNode.gain.setValueAtTime(0, startTime);

        for (let c = 0; c < size; c++) {
          const isDark = qrObj.modules.get(r, c);
          const colStartTime = startTime + c * specColDuration;
          const colEndTime = colStartTime + specColDuration;

          // Divide gain by size to prevent signal clipping
          const targetGain = isDark ? (0.25 / size) : 0.0;

          // Smoothly ramp transitions to prevent audio popping
          gainNode.gain.setValueAtTime(gainNode.gain.value, colStartTime);
          gainNode.gain.linearRampToValueAtTime(targetGain, colStartTime + 0.01);
          gainNode.gain.setValueAtTime(targetGain, colEndTime - 0.01);
          gainNode.gain.linearRampToValueAtTime(0, colEndTime);
        }

        osc.start(startTime);
        osc.stop(startTime + size * specColDuration + 0.1);

        specOscillatorsRef.current.push(osc);
        specGainNodesRef.current.push(gainNode);
      }

      // Start spectrogram drawing loop
      startSpectrogramVisualizer();

      // Automatically clear states when play is complete
      const totalDurationMs = (size * specColDuration + 0.3) * 1000;
      setTimeout(() => {
        stopSpectrogramQR();
      }, totalDurationMs);

    } catch (err: any) {
      alert(`Spectrogram synthesis failed: ${err.message}`);
      setIsPlayingSpectrogram(false);
    }
  };

  const stopSpectrogramQR = () => {
    specOscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    specOscillatorsRef.current = [];
    specGainNodesRef.current = [];
    setIsPlayingSpectrogram(false);
    if (specAnimationRef.current) {
      cancelAnimationFrame(specAnimationRef.current);
      specAnimationRef.current = null;
    }
  };

  // --- Export WAV using OfflineAudioContext ---
  const downloadSpectrogramWav = async () => {
    try {
      setIsGeneratingWav(true);
      const qrObj = QRCode.create(spectrogramText, { errorCorrectionLevel: 'L' });
      const size = qrObj.modules.size;
      const totalDuration = size * specColDuration + 0.5;
      const sampleRate = 44100;

      // Create Offline Context
      const offlineCtx = new (window.OfflineAudioContext || (window as any).OfflineAudioContext)(
        1,
        sampleRate * totalDuration,
        sampleRate
      );

      // Create equivalent nodes on offline timeline
      for (let r = 0; r < size; r++) {
        const freq = specMinFreq + (size - 1 - r) * specFreqSpacing;
        const osc = offlineCtx.createOscillator();
        const gainNode = offlineCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, 0.2);
        osc.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        gainNode.gain.setValueAtTime(0, 0.2);

        for (let c = 0; c < size; c++) {
          const isDark = qrObj.modules.get(r, c);
          const colStartTime = 0.2 + c * specColDuration;
          const colEndTime = colStartTime + specColDuration;
          const targetGain = isDark ? (0.25 / size) : 0.0;

          gainNode.gain.setValueAtTime(0, colStartTime);
          gainNode.gain.linearRampToValueAtTime(targetGain, colStartTime + 0.01);
          gainNode.gain.setValueAtTime(targetGain, colEndTime - 0.01);
          gainNode.gain.linearRampToValueAtTime(0, colEndTime);
        }

        osc.start(0.2);
        osc.stop(totalDuration);
      }

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = bufferToWav(renderedBuffer);

      // Trigger standard browser download
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
  };

  // --- Real-time canvas FFT visualizer (Waterfall plot) ---
  const startSpectrogramVisualizer = () => {
    const canvas = specCanvasRef.current;
    const analyser = specAnalyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Create a temporary canvas for horizontal scrolling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    const draw = () => {
      if (!specAnalyserRef.current || !isPlayingSpectrogram) return;

      analyser.getByteFrequencyData(dataArray);

      // 1. Scroll existing image 1px to the left
      if (tempCtx && ctx) {
        tempCtx.drawImage(canvas, 0, 0);
        ctx.drawImage(tempCanvas, -1.5, 0);
      }

      // 2. Draw current frequency spectrum column on the right edge
      // We are mapping our communication frequency band (e.g. 1000Hz to 4000Hz) to the height of the canvas.
      const binWidth = (getAudioContext().sampleRate) / analyser.fftSize;
      
      const yMinFreq = specMinFreq - 100;
      const yMaxFreq = specMinFreq + qrSize * specFreqSpacing + 100;

      // Render each pixel of the new rightmost vertical column
      for (let y = 0; y < height; y++) {
        // Map Y coordinate (0 at top, height at bottom) to a frequency
        // We want highest frequencies at top, lowest at bottom
        const percent = 1 - (y / height);
        const freq = yMinFreq + percent * (yMaxFreq - yMinFreq);
        const binIndex = Math.round(freq / binWidth);

        const intensity = dataArray[binIndex] || 0;

        // Custom glow theme (Teal/Emerald neon)
        if (intensity > 30) {
          ctx!.fillStyle = `rgba(20, 184, 166, ${intensity / 255})`;
          ctx!.fillRect(width - 2, y, 2, 1);
        } else {
          ctx!.fillStyle = '#0a0f1d';
          ctx!.fillRect(width - 2, y, 2, 1);
        }
      }

      specAnimationRef.current = requestAnimationFrame(draw);
    };

    specAnimationRef.current = requestAnimationFrame(draw);
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen w-full bg-slate-50 transition-colors duration-300 dark:bg-slate-950`}>
      
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Navigation / Header */}
        <nav className="mb-6 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-5" />
            Back to Home
          </a>
          <Button
            variant="icon"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full bg-white shadow-sm dark:bg-slate-800"
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="size-5 text-yellow-400" /> : <Moon className="size-5 text-indigo-600" />}
          </Button>
        </nav>

        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            <Volume2 className="size-6" />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold text-slate-900 md:text-4xl dark:text-white">
            Acoustic Steganography & Audio QR
          </h1>
          <p className="mx-auto max-w-3xl text-sm text-slate-600 md:text-base dark:text-slate-300">
            Convert standard QR payloads or binary messages into audible signals. Transmit secure files or custom text over acoustic airwaves, or synthesize QR art onto real-time visual spectrogram streams.
          </p>
        </header>

        {/* Tab Selection */}
        <div className="mb-8 flex justify-center border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => { stopChirpTransmission(); stopChirpListening(); stopSpectrogramQR(); setActiveTab('chirp'); }}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'chirp'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Mic className="size-4" />
            1. Acoustic Modem (Chirp Transceiver)
          </button>
          <button
            onClick={() => { stopChirpTransmission(); stopChirpListening(); stopSpectrogramQR(); setActiveTab('spectrogram'); }}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'spectrogram'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Music className="size-4" />
            2. Spectrogram QR Art Generator
          </button>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* LEFT SIDE: CONTROLS */}
          <div className="space-y-6 lg:col-span-5">
            
            {activeTab === 'chirp' ? (
              /* TAB 1 CONTROLS */
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                  <Sliders className="size-5 text-teal-500" />
                  Modem Configuration
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="chirp-text-input" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Message to Transmit (ASCII)
                    </label>
                    <input
                      id="chirp-text-input"
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                      value={chirpText}
                      onChange={(e) => setChirpText(e.target.value.toUpperCase().replace(/[^A-Z0-9\s!?,.]/g, ''))}
                      placeholder="ENTER TEXT PAYLOAD"
                      disabled={isTransmitting || isListening}
                    />
                    <p className="text-2xs mt-1 text-slate-400">
                      Supports upper-case letters, digits, and basic punctuation.
                    </p>
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900/30 dark:bg-teal-950/20">
                    <h3 className="mb-1 flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300">
                      <Info className="size-3.5" /> BFSK Protocols
                    </h3>
                    <p className="text-2xs leading-relaxed text-teal-700/80 dark:text-teal-400/80">
                      This modem encodes messages to binary bitstreams. Tones are scheduled sequentially: 1500Hz prefixes the frame, 1200Hz represents '0', and 2200Hz represents '1'. A 30ms guard interval separates consecutive pulses to secure perfect boundary detection.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {!isTransmitting ? (
                      <Button
                        variant="primary"
                        onClick={startChirpTransmission}
                        disabled={!chirpText || isListening}
                      >
                        <Play className="size-4" />
                        Transmit Chirp
                      </Button>
                    ) : (
                      <Button
                        variant="error"
                        onClick={stopChirpTransmission}
                      >
                        <Square className="size-4" />
                        Stop Playback
                      </Button>
                    )}

                    {!isListening ? (
                      <Button
                        variant="outline"
                        onClick={startChirpListening}
                        disabled={isTransmitting}
                      >
                        <Mic className="size-4 animate-pulse text-teal-500" />
                        Listen/Receive
                      </Button>
                    ) : (
                      <Button
                        variant="error"
                        onClick={stopChirpListening}
                      >
                        <Square className="size-4" />
                        Stop Listening
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              /* TAB 2 CONTROLS */
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                  <Sliders className="size-5 text-teal-500" />
                  Art Configuration
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="spectrogram-text-input" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      QR Payload String
                    </label>
                    <input
                      id="spectrogram-text-input"
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:focus:border-teal-500 dark:focus:bg-slate-900"
                      value={spectrogramText}
                      onChange={(e) => setSpectrogramText(e.target.value.substring(0, 15))}
                      placeholder="LISTEN"
                      disabled={isPlayingSpectrogram || isGeneratingWav}
                    />
                    <p className="text-2xs mt-1 text-slate-400">
                      Keep text short (under 15 chars) for beautiful high-contrast renders.
                    </p>
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900/30 dark:bg-teal-950/20">
                    <h3 className="mb-1 flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300">
                      <Info className="size-3.5" /> Spectrogram QR Synthesis
                    </h3>
                    <p className="text-2xs leading-relaxed text-teal-700/80 dark:text-teal-400/80">
                      Maps the QR code's 2D grid matrix into an acoustic canvas. Each column represents a 250ms segment of time. Each row corresponds to a specific frequency sine wave (spaced 80Hz apart). Summed sine waves are generated in real-time, painting a readable QR code onto spectrogram waterfall FFT analyzers.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {!isPlayingSpectrogram ? (
                      <Button
                        variant="primary"
                        onClick={playSpectrogramQR}
                        disabled={!spectrogramText || isGeneratingWav}
                      >
                        <Play className="size-4" />
                        Play & Render
                      </Button>
                    ) : (
                      <Button
                        variant="error"
                        onClick={stopSpectrogramQR}
                      >
                        <Square className="size-4" />
                        Stop Art
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={downloadSpectrogramWav}
                      disabled={!spectrogramText || isPlayingSpectrogram || isGeneratingWav}
                    >
                      <Download className="size-4 text-teal-500" />
                      {isGeneratingWav ? 'Exporting...' : 'Export WAV'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Common technical specifications card */}
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <QrCode className="size-4" /> Core Technical Specifications
              </h2>
              <ul className="text-2xs space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800/40">
                  <span>Modem Protocol:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Binary FSK (Non-Coherent)</span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800/40">
                  <span>Modulation Bitrate:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">10 bits / sec (100ms duration)</span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800/40">
                  <span>Frequencies:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">1200Hz ('0'), 2200Hz ('1'), 1500Hz (Sync)</span>
                </li>
                <li className="flex justify-between pb-1.5">
                  <span>Spectrogram Band:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">1.2 kHz - 4.5 kHz</span>
                </li>
              </ul>
            </Card>

          </div>

          {/* RIGHT SIDE: LIVE FEEDBACK & GRAPH */}
          <div className="lg:col-span-7">
            
            {activeTab === 'chirp' ? (
              /* TAB 1 VISUALS */
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">
                      Receiver Terminal Output
                    </h2>
                    <span className={`text-2xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                      isListening 
                        ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                    }`}>
                      <span className={`size-1.5 rounded-full ${isListening ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                      {isListening ? 'LISTENING' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Active Frequency/Symbol Indicator */}
                  <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-900 dark:bg-slate-900/30">
                    <div>
                      <div className="text-3xs font-bold tracking-wide text-slate-400 uppercase">Detected Symbol</div>
                      <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{currentSymbol}</div>
                    </div>
                    <div>
                      <div className="text-3xs font-bold tracking-wide text-slate-400 uppercase">Total Decoded Payload</div>
                      <div className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                        {decodedMessage ? `"${decodedMessage}"` : <span className="text-slate-400 italic">Empty</span>}
                      </div>
                    </div>
                  </div>

                  {/* Terminal Logger */}
                  <div className="text-2xs h-64 overflow-y-auto rounded-xl bg-slate-900 p-4 font-mono leading-relaxed text-teal-400/90 shadow-inner">
                    {receiverLog.length === 0 ? (
                      <div className="text-slate-500 italic">No activity logs recorded. Click "Listen/Receive" and transmit some data to start decoding...</div>
                    ) : (
                      receiverLog.map((log, index) => (
                        <div key={index} className="border-b border-slate-800/40 py-1">
                          <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            ) : (
              /* TAB 2 VISUALS */
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">
                      Spectrogram Visualizer Canvas
                    </h2>
                    <span className={`text-2xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                      isPlayingSpectrogram 
                        ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                    }`}>
                      <span className={`size-1.5 rounded-full ${isPlayingSpectrogram ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                      {isPlayingSpectrogram ? 'DRAWING QR CODE' : 'STANDBY'}
                    </span>
                  </div>

                  {/* Waterfall Spectrogram scrolling display */}
                  <div className="mb-6 flex min-h-75 items-center justify-center rounded-2xl border border-slate-100 bg-slate-900 p-4 dark:border-slate-900">
                    <canvas
                      ref={specCanvasRef}
                      className="max-h-[60vh] w-full rounded-lg bg-[#0a0f1d] object-contain shadow-sm"
                      width={512}
                      height={320}
                      role="img"
                      aria-label="Waterfalls spectrogram FFT visualizer scrolling from right to left"
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/30">
                    <Info className="mt-0.5 size-5 shrink-0 text-teal-500" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">How to scan this QR sound?</h4>
                      <p className="text-2xs leading-relaxed text-slate-600 dark:text-slate-400">
                        This sound actually encodes the QR code modules. When played back, the horizontal pixels render row-by-row on the scrolling visualizer. If you put a camera in front of this visualizer screen, any standard QR scanner app will recognize the glowing pattern and read the data!
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

/**
 * Default Page component wrapping AudioQRToolInner inside QRProvider.
 * @returns The rendered Page.
 */
export default function Page() {
  return (
    <QRProvider>
      <AudioQRToolInner />
    </QRProvider>
  );
}
