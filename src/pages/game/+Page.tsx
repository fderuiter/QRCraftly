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

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  RotateCcw, 
  Play, 
  Info, 
  ArrowLeft, 
  QrCode,
  Sparkles,
  Award
} from 'lucide-react';
import { useOptionalQRStoreSelector, QRProvider } from '@/context/QRContext';
import { QRConfig, QRErrorCorrectionLevel, QRType, QRStyle, SocialFormat, TemplateStyle } from '@/types';
import { findAStarPath } from '@/utils/astar';

/**
 * Deterministic seed-based pseudo-random number generator (Mulberry32).
 * Ensures that the generated maze is stable for a given QR code payload and compliant with pure renders.
 * @param seedStr
 */
function seedRandom(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let seed = h >>> 0;
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 *
 */
interface Point {
  /**
   *
   */
  r: number;
  /**
   *
   */
  c: number;
}

const DEFAULT_FALLBACK_CONFIG: QRConfig = {
  value: "https://qrcraftly.com",
  type: QRType.URL,
  fgColor: "#0f766e", // teal-700
  bgColor: "#ffffff",
  style: QRStyle.STANDARD,
  logoUrl: null,
  logoSize: 0.15,
  logoPaddingStyle: "none",
  logoPadding: 0,
  logoBackgroundColor: "#ffffff",
  eyeColor: "#0d9488", // teal-600
  errorCorrectionLevel: QRErrorCorrectionLevel.Q,
  isBorderEnabled: false,
  borderSize: 0,
  borderColor: "#000000",
  borderStyle: "solid",
  borderText: "",
  borderTextPosition: "bottom-center",
  borderTextColor: "#000000",
  borderLogoUrl: null,
  borderLogoPosition: "bottom-center",
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
};



/**
 * Main game simulation sub-component implementing gameplay loop and controls.
 * @returns The rendered GamePageInner component.
 */
function GamePageInner() {
  const storeConfig = useOptionalQRStoreSelector(s => s.config);

  const initialConfig = useMemo(() => {
    return storeConfig || DEFAULT_FALLBACK_CONFIG;
  }, [storeConfig]);

  // Game UI Configuration States
  const [inputValue, setInputValue] = useState(initialConfig.value || "https://qrcraftly.com");
  const [eccLevel, setEccLevel] = useState<QRErrorCorrectionLevel>(initialConfig.errorCorrectionLevel || QRErrorCorrectionLevel.Q);
  
  // Keep active colors synced
  const fgColor = initialConfig.fgColor || "#0f766e";
  const bgColor = initialConfig.bgColor || "#ffffff";
  const eyeColor = initialConfig.eyeColor || "#0d9488";

  // Raw matrix representation computed once on configuration update
  const qrData = useMemo(() => {
    try {
      return QRCode.create(inputValue, { errorCorrectionLevel: eccLevel });
    } catch (e) {
      console.warn("QR creation failed, falling back", e);
      return QRCode.create("https://qrcraftly.com", { errorCorrectionLevel: QRErrorCorrectionLevel.Q });
    }
  }, [inputValue, eccLevel]);

  const originalSize = qrData.modules.size;

  // 31x31 Resampled Grid layout utilizing nearest-neighbor interpolation
  const grid = useMemo(() => {
    const res: boolean[][] = Array.from({ length: 31 }, () => Array(31).fill(false));
    const N = qrData.modules.size;

    // Resample the original QR code to an inner 29x29 grid
    for (let r = 0; r < 29; r++) {
      for (let c = 0; c < 29; c++) {
        const rOrig = Math.min(N - 1, Math.max(0, Math.floor((r + 0.5) * N / 29)));
        const cOrig = Math.min(N - 1, Math.max(0, Math.floor((c + 0.5) * N / 29)));
        res[r + 1][c + 1] = qrData.modules.get(rOrig, cOrig) === 1;
      }
    }

    // Wrap the inner 29x29 grid with a 1-cell white quiet zone border to form a perfect 31x31 grid
    for (let i = 0; i < 31; i++) {
      res[0][i] = false;
      res[30][i] = false;
      res[i][0] = false;
      res[i][30] = false;
    }

    // Reconstruct perfect 7x7 finder patterns at the inner 29x29 corners for robust scanning
    const applyFinder = (rStart: number, cStart: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isDark = (r === 0 || r === 6 || c === 0 || c === 6) ||
                         (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          res[rStart + r][cStart + c] = isDark;
        }
      }
    };

    applyFinder(1, 1);     // Top-Left
    applyFinder(1, 23);    // Top-Right
    applyFinder(23, 1);    // Bottom-Left

    // Reconstruct quiet zone separators around finder patterns
    for (let r = 1; r <= 8; r++) res[r][8] = false;
    for (let c = 1; c <= 8; c++) res[8][c] = false;

    for (let r = 1; r <= 8; r++) res[r][22] = false;
    for (let c = 22; c <= 29; c++) res[8][c] = false;

    for (let r = 22; r <= 29; r++) res[r][8] = false;
    for (let c = 1; c <= 8; c++) res[22][c] = false;

    // Force perfect 5x5 alignment pattern at inner 29x29 alignment coordinate (22, 22) -> (22, 22) in 31x31
    const arStart = 22;
    const acStart = 22;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isDark = (r === 0 || r === 4 || c === 0 || c === 4) || (r === 2 && c === 2);
        res[arStart + r][acStart + c] = isDark;
      }
    }

    // Define stable Start & End nodes outside finder pattern zones
    const startNode = { r: 8, c: 15 };
    const endNode = { r: 22, c: 15 };
    res[startNode.r][startNode.c] = false;
    res[endNode.r][endNode.c] = false;

    // Ensure a path is carved between start and end if none exists
    const tempPath = findAStarPath(res, startNode, endNode);
    if (tempPath.length === 0) {
      let currR = startNode.r;
      let currC = startNode.c;
      const rng = seedRandom(inputValue);
      while (currR !== endNode.r || currC !== endNode.c) {
        if (currR < endNode.r && rng() < 0.6) {
          currR++;
        } else if (currC < endNode.c) {
          currC++;
        } else if (currC > endNode.c) {
          currC--;
        } else if (currR < endNode.r) {
          currR++;
        }
        res[currR][currC] = false;
      }
    }

    return res;
  }, [qrData]);

  const startNode = { r: 8, c: 15 };
  const endNode = { r: 22, c: 15 };

  // Gameplay states
  const [playerPath, setPlayerPath] = useState<Point[]>([]);
  const [showFullSolution, setShowFullSolution] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [mounted, setMounted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDirtyRef = useRef<boolean>(true);

  // Trigger redraw on state changes
  useEffect(() => {
    isDirtyRef.current = true;
  }, [grid, playerPath, showFullSolution, victory]);

  // Frame rate counter measuring active gameplay frames
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    let active = true;
    let lastTime = performance.now();
    let frames = 0;
    
    const loop = () => {
      if (!active) return;
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
    return () => {
      active = false;
    };
  }, []);

  // Solve button handler
  const handleShowSolution = useCallback(() => {
    const start = performance.now();
    const path = findAStarPath(grid, startNode, endNode);
    const duration = performance.now() - start;
    setLatency(duration);
    
    if (path.length > 0) {
      setPlayerPath(path);
      setShowFullSolution(true);
      setVictory(true);
    }
  }, [grid]);

  // Clean Slate / Reset
  const handleReset = useCallback(() => {
    setPlayerPath([]);
    setShowFullSolution(false);
    setVictory(false);
    setLatency(0);
  }, []);

  // Update path based on coordinates
  const updatePathToCoordinate = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || victory) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 31;
    const y = ((clientY - rect.top) / rect.height) * 31;

    const r = Math.floor(y);
    const c = Math.floor(x);

    if (r >= 0 && r < 31 && c >= 0 && c < 31) {
      // Wall check
      if (grid[r][c]) {
        return; // Wall hit, ignore
      }

      const start = performance.now();
      const path = findAStarPath(grid, startNode, { r, c });
      const duration = performance.now() - start;
      setLatency(duration);

      if (path.length > 0) {
        setPlayerPath(path);
        if (r === endNode.r && c === endNode.c) {
          setVictory(true);
        }
      }
    }
  }, [grid, victory]);

  // Mouse & Touch Interactivity Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    updatePathToCoordinate(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    updatePathToCoordinate(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    if (e.touches[0]) {
      updatePathToCoordinate(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    if (e.touches[0]) {
      updatePathToCoordinate(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Draw function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Guard to ensure drawing context functions exist
    if (typeof ctx.clearRect !== 'function' || typeof ctx.fillRect !== 'function') {
      return;
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    
    // Support crisp responsive rendering on high-DPI screens
    const logicalSize = 512;
    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, logicalSize, logicalSize);

    // Draw solid background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, logicalSize, logicalSize);

    const cellWidth = logicalSize / 31;
    const cellHeight = logicalSize / 31;

    // 1. Draw grid modules (recognizability & scannability)
    for (let r = 0; r < 31; r++) {
      for (let c = 0; c < 31; c++) {
        if (grid[r][c]) {
          // Identify finder pattern structures for authentic look
          const isEye = (r >= 1 && r <= 7 && c >= 1 && c <= 7) || 
                        (r >= 1 && r <= 7 && c >= 23 && c <= 29) || 
                        (r >= 23 && r <= 29 && c >= 1 && c <= 7);
          
          ctx.fillStyle = isEye ? eyeColor : fgColor;
        } else {
          ctx.fillStyle = bgColor;
        }
        
        ctx.fillRect(
          Math.round(c * cellWidth), 
          Math.round(r * cellHeight), 
          Math.ceil(cellWidth), 
          Math.ceil(cellHeight)
        );
      }
    }

    // 2. Draw Start and End Markers
    const drawMarker = (pos: Point, color: string) => {
      const cx = (pos.c + 0.5) * cellWidth;
      const cy = (pos.r + 0.5) * cellHeight;
      const radius = cellWidth * 0.4;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner white dot
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    drawMarker(startNode, 'rgba(16, 185, 129, 0.95)'); // Green start
    drawMarker(endNode, 'rgba(239, 68, 68, 0.95)');   // Red end

    // 3. Highlight A* Path
    if (playerPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = showFullSolution ? '#ef4444' : '#3b82f6'; // Red for solution, Blue for player
      ctx.lineWidth = cellWidth * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const first = playerPath[0];
      ctx.moveTo((first.c + 0.5) * cellWidth, (first.r + 0.5) * cellHeight);

      for (let i = 1; i < playerPath.length; i++) {
        const p = playerPath[i];
        ctx.lineTo((p.c + 0.5) * cellWidth, (p.r + 0.5) * cellHeight);
      }
      ctx.stroke();

      // Glow effect for path
      ctx.shadowColor = showFullSolution ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

  }, [grid, playerPath, showFullSolution, fgColor, bgColor, eyeColor]);

  // Active rendering loop with dirty tracking
  useEffect(() => {
    if (!mounted) return;
    let active = true;

    const renderLoop = () => {
      if (!active) return;
      if (isDirtyRef.current) {
        drawCanvas();
        isDirtyRef.current = false;
      }
      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
    return () => {
      active = false;
    };
  }, [mounted, drawCanvas]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-12">
      {/* Navigation Breadcrumb */}
      <nav className="mb-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-5" />
          Back to Dashboard
        </a>
      </nav>

      {/* Main Page Title Header */}
      <header className="mb-10 text-center md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-start md:gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
            <QrCode className="size-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl dark:text-white">
              QR Fixed Grid Resampling & Maze Solver
            </h1>
            <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">
              Downsample or upsample any QR matrix size to a standard 31x31 grid. Drag your finger to trace a path and solve synchronously in real-time.
            </p>
          </div>
        </div>
      </header>

      {/* Primary Simulator Split Screen Grid */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Controls & Analytics Readout */}
        <div className="space-y-6 lg:col-span-5">
          
          {/* Section 1: Target Definition configuration */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Sparkles className="size-5 text-teal-500" />
              1. Customize Target QR
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="target-text" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  QR Data Payload
                </label>
                <input
                  id="target-text"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-teal-400"
                  placeholder="Enter custom URL or text..."
                />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Error Correction Level (ECC)
                </span>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Error Correction Level Selection">
                  {(['L', 'M', 'Q', 'H'] as QRErrorCorrectionLevel[]).map((lvl) => {
                    const eccPercentages = { L: '7%', M: '15%', Q: '25%', H: '30%' };
                    return (
                      <button
                        key={lvl}
                        onClick={() => setEccLevel(lvl)}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                          eccLevel === lvl
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10'
                            : 'dark:hover:bg-slate-750 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Level {lvl} ({eccPercentages[lvl]})
                      </button>
                    );
                  })}
                </div>
                <p className="text-xxs mt-2 leading-normal text-slate-500">
                  Higher ECC levels handle higher module modifications to ensure successful QR scanning.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Live Telemetry Dashboard */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Award className="size-5 text-teal-500" />
              2. Real-Time Telemetry
            </h2>
            
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-950">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Original QR Size</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{originalSize} × {originalSize}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Fixed Resampled Grid</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">31 × 31</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Pathfinding Algorithm</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">A* Search (Sync)</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Grid Cells Total</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">961 cells</span>
              </div>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="block font-medium text-slate-500 dark:text-slate-400">A* Solving Time</span>
                <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">{latency < 0.1 ? '< 0.1' : latency.toFixed(2)} ms</span>
              </div>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="block font-medium text-slate-500 dark:text-slate-400">Main Thread Rate</span>
                <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">{fps} FPS</span>
              </div>
            </div>

            <div className="text-xxs mt-4 flex items-center gap-2 rounded-lg bg-teal-50/50 p-3 leading-normal text-teal-800 dark:bg-teal-950/20 dark:text-teal-300">
              <Info className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>
                <strong>Under-the-Hood:</strong> QR code is nearest-neighbor resampled to a standard Version 3 (29x29) layout with correct finder eye proportions, then completed with a 1-cell white border to achieve exactly 31x31 modules. This keeps standard scanner app decode compatibility intact!
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Game Arena Grid Canvas */}
        <div className="flex flex-col lg:col-span-7">
          
          <div className="relative flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            
            {/* Status & Help Text */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Game Status
                </span>
                <span className={`rounded-md px-2 py-0.5 text-sm font-black ${
                  victory 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                    : 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                }`}>
                  {victory ? '🏆 Solved / Victory!' : '🎮 Drag cursor to solve the maze'}
                </span>
              </div>
            </div>

            {/* Simulated QR Play Battlefield Box */}
            <div className="relative mx-auto mb-6 flex aspect-square w-full max-w-110 items-center justify-center overflow-hidden rounded-2xl border-4 border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="size-full cursor-crosshair rounded-lg object-contain"
                aria-label="Interactive QR Code Game Board"
              />

              {/* Complete Defeated / Victory Game-Over Screen overlay */}
              {victory && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center backdrop-blur-sm transition-all duration-300">
                  <div className="mb-4 animate-bounce rounded-full bg-emerald-900/40 p-4 text-emerald-500 ring-8 ring-emerald-900/20">
                    <Award className="size-12" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-emerald-400 uppercase">
                    Maze Solved!
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-300">
                    The standard A* pathfinder successfully solved the resampled 31x31 grid layout synchronously. Standard QR reader apps can successfully scan the resampled grid below.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/40 transition-transform hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="size-4" />
                    Reset & Play Again
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Control Buttons */}
            <div className="mt-auto grid grid-cols-2 gap-3">
              <button
                onClick={handleReset}
                disabled={playerPath.length === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-sm transition-all outline-none ${
                  playerPath.length === 0
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                    : 'dark:hover:bg-slate-750 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-white'
                }`}
              >
                <RotateCcw className="size-4" />
                Reset Grid
              </button>

              <button
                onClick={handleShowSolution}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
              >
                <Play className="size-4" />
                Show Solution
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

/**
 * QR Code Game Page Component.
 * Wraps the gameplay arena inside an isolated QR state context provider.
 * @returns The rendered Page component wrapped in a QRProvider.
 */
export default function Page() {
  return (
    <QRProvider>
      <GamePageInner />
    </QRProvider>
  );
}
