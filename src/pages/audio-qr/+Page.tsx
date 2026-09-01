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

import React, { useState } from 'react';
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
import { useAudioContext } from '@/hooks/useAudioContext';
import { useChirpTransceiver } from '@/hooks/useChirpTransceiver';
import { useSpectrogramQR } from '@/hooks/useSpectrogramQR';
import { bufferToWav } from '@/utils/spectrogramDspEngine';
import { QRProvider } from '@/context/QRContext';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { contentRegistry } from '@/data/contentRegistry';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { SidebarContent } from '@/components/SidebarContent';
import { usePageContext } from 'vike-react/usePageContext';

/**
 *
 */
export { bufferToWav };

/**
 * Acoustic Steganography & Audio QR Code page
 */
function AudioQRToolInner() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'chirp' | 'spectrogram'>('chirp');

  const { getAudioContext } = useAudioContext();

  const {
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
  } = useChirpTransceiver(getAudioContext);

  const {
    spectrogramText,
    setSpectrogramText,
    isPlayingSpectrogram,
    isGeneratingWav,
    specCanvasRef,
    playSpectrogramQR,
    stopSpectrogramQR,
    downloadSpectrogramWav,
  } = useSpectrogramQR(getAudioContext);

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
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? '/audio-qr';
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(contentRegistry['audio-qr'], resolvedDomain, urlPathname);

  return (
    <QRProvider>
      <JsonLdScript data={schemaData} />
      <AudioQRToolInner />
      <div className="mx-auto max-w-3xl px-4 pb-12">
        <SidebarContent toolId="audio-qr" />
      </div>
    </QRProvider>
  );
}
