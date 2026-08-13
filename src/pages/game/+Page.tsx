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
  Target, 
  Zap, 
  Flame, 
  Bomb, 
  RotateCcw, 
  Trash2, 
  Play, 
  Info, 
  ArrowLeft, 
  AlertTriangle,
  QrCode,
  Sparkles,
  Award,
  Activity,
  ZapOff
} from 'lucide-react';
import { useOptionalQRStoreSelector, QRProvider } from '@/context/QRContext';
import { QRConfig, QRErrorCorrectionLevel, QRType, QRStyle, SocialFormat, TemplateStyle } from '@/types';

// Standard Reed-Solomon QR budgets coefficients
const ECC_COEFFICIENTS = {
  L: 0.07, // ~7%
  M: 0.15, // ~15%
  Q: 0.25, // ~25%
  H: 0.30, // ~30%
};

/**
 * Represents a coordinate blast on the canvas.
 */
interface Blast {
  /** The horizontal pixel coordinate of the blast epicenter. */
  x: number;
  /** The vertical pixel coordinate of the blast epicenter. */
  y: number;
  /** The visual blast shockwave radius in pixels. */
  radiusPx: number;
  /** The visual theme color of the explosion. */
  color: string;
  /** A unique identification key for React rendering list loops. */
  key: string;
}

// Weapons definition with visual cues and radius
const WEAPONS = [
  { 
    id: 'laser', 
    name: 'Pinpoint Laser', 
    radius: 0, 
    description: 'Fires a concentrated laser beam targeting exactly one module', 
    color: 'rgba(239, 68, 68, 0.85)', // red
    accentColor: 'text-red-500 bg-red-100 dark:bg-red-950/40 dark:text-red-400',
    icon: Target 
  },
  { 
    id: 'plasma', 
    name: 'Plasma Charge', 
    radius: 1, 
    description: 'Explosive charge that scorches a 3x3 grid neighborhood', 
    color: 'rgba(249, 115, 22, 0.85)', // orange
    accentColor: 'text-orange-500 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400',
    icon: Zap 
  },
  { 
    id: 'neutron', 
    name: 'Neutron Blast', 
    radius: 2, 
    description: 'High-energy blast damaging modules within a 5x5 radius', 
    color: 'rgba(234, 179, 8, 0.85)', // yellow
    accentColor: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-400',
    icon: Flame 
  },
  { 
    id: 'nuke', 
    name: 'Thermonuclear Nuke', 
    radius: 4, 
    description: 'Unleashes massive crater damage spanning a 9x9 sector', 
    color: 'rgba(168, 85, 247, 0.85)', // purple
    accentColor: 'text-purple-500 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400',
    icon: Bomb 
  },
];

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

  const size = qrData.modules.size;

  // Active gameplay states
  const [damagedModules, setDamagedModules] = useState<Set<string>>(new Set());
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [latency, setLatency] = useState(0.1);
  const [fps, setFps] = useState(60);
  const [mounted, setMounted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Monitor layout mounting for canvas context access
  useEffect(() => {
    setMounted(true);
  }, []);

  // Frame rate counter measuring active gameplay frames
  useEffect(() => {
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

  // Quick Action: Clean Slate / Reset Grid
  const handleReset = useCallback(() => {
    setDamagedModules(new Set());
    setBlasts([]);
  }, []);

  // Reset damage automatically when base QR changes to avoid layout mismatch
  useEffect(() => {
    handleReset();
  }, [qrData, handleReset]);

  // Main-thread synchronous damage coordinate mapping logic
  const fireBlast = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const start = performance.now();

    const rect = canvas.getBoundingClientRect();
    
    // Support responsive scaling by mapping bounding box coordinates
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    // Row / Column index coordinates mapping
    const r = Math.floor((y / canvas.height) * size);
    const c = Math.floor((x / canvas.width) * size);

    const R = selectedWeapon.radius;
    const newDamaged = new Set(damagedModules);

    // Apply circular blast area module updates
    for (let row = r - R; row <= r + R; row++) {
      for (let col = c - R; col <= c + R; col++) {
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (R === 0 || Math.hypot(row - r, col - c) <= R) {
            newDamaged.add(`${row},${col}`);
          }
        }
      }
    }

    setDamagedModules(newDamaged);

    // Capture visual pixel coordinate blast points for drawing
    const radiusPx = (R + 0.5) * (canvas.width / size);
    setBlasts(prev => [
      ...prev,
      {
        x,
        y,
        radiusPx,
        color: selectedWeapon.color,
        key: `${Date.now()}-${Math.random()}`
      }
    ]);

    const duration = performance.now() - start;
    // Update telemetry state
    setLatency(Number(duration.toFixed(2)));
  }, [size, selectedWeapon, damagedModules]);

  // Mouse & Touch Interactivity Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    fireBlast(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    fireBlast(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    if (e.touches[0]) {
      fireBlast(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.touches[0]) {
      fireBlast(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  // Automatic artillery simulation to stress-test calculations
  const simulateBarrage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const start = performance.now();
    const count = 12; // 12 sequential strikes
    const newDamaged = new Set(damagedModules);
    const newBlasts = [...blasts];

    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;

      const r = Math.floor((y / canvas.height) * size);
      const c = Math.floor((x / canvas.width) * size);

      const randWeapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
      const R = randWeapon.radius;

      for (let row = r - R; row <= r + R; row++) {
        for (let col = c - R; col <= c + R; col++) {
          if (row >= 0 && row < size && col >= 0 && col < size) {
            if (R === 0 || Math.hypot(row - r, col - c) <= R) {
              newDamaged.add(`${row},${col}`);
            }
          }
        }
      }

      const radiusPx = (R + 0.5) * (canvas.width / size);
      newBlasts.push({
        x,
        y,
        radiusPx,
        color: randWeapon.color,
        key: `${Date.now()}-${i}-${Math.random()}`
      });
    }

    setDamagedModules(newDamaged);
    setBlasts(newBlasts);

    const duration = performance.now() - start;
    setLatency(Number((duration / count).toFixed(2)));
  }, [size, damagedModules, blasts]);

  // Real-time canvas rendering hook
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Guard to ensure drawing context functions exist (e.g. in test envs)
    if (typeof ctx.clearRect !== 'function' || typeof ctx.fillRect !== 'function') {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw solid QR background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockWidth = canvas.width / size;
    const blockHeight = canvas.height / size;

    // 1. Draw baseline QR code modules
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qrData.modules.get(r, c)) {
          // Identify finder pattern structures for authentic high-fidelity look
          const isEye = (r < 7 && c < 7) || 
                        (r < 7 && c >= size - 7) || 
                        (r >= size - 7 && c < 7);
          
          ctx.fillStyle = isEye ? eyeColor : fgColor;
          ctx.fillRect(
            c * blockWidth, 
            r * blockHeight, 
            blockWidth + 0.5, 
            blockHeight + 0.5
          );
        }
      }
    }

    // 2. Overlay individual charred/damaged module blocks
    for (const key of damagedModules) {
      const [rStr, cStr] = key.split(',');
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);

      // Red thermal overlay
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.fillRect(
        c * blockWidth,
        r * blockHeight,
        blockWidth,
        blockHeight
      );

      // Dark carbon charcoal crater core
      if (typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function' && typeof ctx.fill === 'function') {
        ctx.fillStyle = 'rgba(31, 41, 55, 0.85)';
        ctx.beginPath();
        ctx.arc(
          (c + 0.5) * blockWidth,
          (r + 0.5) * blockHeight,
          blockWidth * 0.25,
          0,
          2 * Math.PI
        );
        ctx.fill();
      } else {
        // Fallback for mock environments
        ctx.fillStyle = 'rgba(31, 41, 55, 0.85)';
        ctx.fillRect(
          (c + 0.25) * blockWidth,
          (r + 0.25) * blockHeight,
          blockWidth * 0.5,
          blockHeight * 0.5
        );
      }
    }

    // 3. Render circular blast shockwave rings
    for (const blast of blasts) {
      if (typeof ctx.createRadialGradient === 'function' && typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function' && typeof ctx.fill === 'function') {
        try {
          const grad = ctx.createRadialGradient(blast.x, blast.y, 0, blast.x, blast.y, blast.radiusPx);
          grad.addColorStop(0, 'rgba(251, 146, 60, 0.7)'); // orange heat center
          grad.addColorStop(0.4, 'rgba(239, 68, 68, 0.35)'); // red shockwave
          grad.addColorStop(0.8, 'rgba(127, 29, 29, 0.1)'); // thermal scorch edge
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // fully transparent

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(blast.x, blast.y, blast.radiusPx, 0, 2 * Math.PI);
          ctx.fill();
        } catch (_e) {
          // silent catch in mock environments
        }
      } else {
        // Fallback for mock environments
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(
          blast.x - blast.radiusPx,
          blast.y - blast.radiusPx,
          blast.radiusPx * 2,
          blast.radiusPx * 2
        );
      }
    }
  }, [mounted, qrData, size, damagedModules, blasts, fgColor, bgColor, eyeColor]);

  // Real-time ECC budget math (Main-thread, no library overhead)
  const totalModules = size * size;
  const maxDamagedAllowed = useMemo(() => {
    return Math.floor(totalModules * ECC_COEFFICIENTS[eccLevel]);
  }, [totalModules, eccLevel]);

  const damagedCount = damagedModules.size;
  const healthRatio = useMemo(() => {
    return Math.max(0, 1 - (damagedCount / maxDamagedAllowed));
  }, [damagedCount, maxDamagedAllowed]);

  const healthPercent = Math.round(healthRatio * 100);

  // Health bar color gradients
  const healthBarColor = useMemo(() => {
    if (healthPercent > 60) return 'bg-emerald-500';
    if (healthPercent > 25) return 'bg-amber-500';
    return 'bg-rose-600 animate-pulse';
  }, [healthPercent]);

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
              QR Analytical Module-Damage Simulator
            </h1>
            <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">
              Interactive playground mapping physical screen blast coordinates to Reed-Solomon error correction boundaries.
            </p>
          </div>
        </div>
      </header>

      {/* Primary Simulator Split Screen Grid */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Controls, Weapons & Analytics Readout */}
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
                  {(['L', 'M', 'Q', 'H'] as QRErrorCorrectionLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setEccLevel(lvl)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        eccLevel === lvl
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10'
                          : 'dark:hover:bg-slate-750 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      Level {lvl} ({Math.round(ECC_COEFFICIENTS[lvl] * 100)}%)
                    </button>
                  ))}
                </div>
                <p className="text-xxs mt-2 leading-normal text-slate-500">
                  Higher ECC levels handle higher module destruction before scan failure occurs.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Weapon Selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Activity className="size-5 text-teal-500" />
              2. Select Blast Weapon
            </h2>
            <div className="space-y-3" role="radiogroup" aria-label="Weapon Selection">
              {WEAPONS.map((weap) => {
                const IconComponent = weap.icon;
                const isSelected = selectedWeapon.id === weap.id;
                return (
                  <button
                    key={weap.id}
                    onClick={() => setSelectedWeapon(weap)}
                    role="radio"
                    aria-checked={isSelected}
                    className={`flex w-full items-start gap-4 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/20'
                        : 'border-slate-100 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${weap.accentColor}`}>
                      <IconComponent className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {weap.name}
                        </span>
                        <span className="text-xxs rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {weap.radius === 0 ? 'Pinpoint' : `Radius: ${weap.radius}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {weap.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Telemetry Dashboard */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Award className="size-5 text-teal-500" />
              3. Real-Time Telemetry
            </h2>
            
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-950">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">QR Version Grid</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{size} × {size}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Total Modules</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{totalModules}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Damage Budget</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{maxDamagedAllowed} max</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Destroyed Count</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{damagedCount} modules</span>
              </div>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="block font-medium text-slate-500 dark:text-slate-400">Blast Math Latency</span>
                <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">{latency} ms</span>
              </div>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="block font-medium text-slate-500 dark:text-slate-400">Gameplay Engine</span>
                <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">{fps} FPS</span>
              </div>
            </div>

            <div className="text-xxs mt-4 flex items-center gap-2 rounded-lg bg-teal-50/50 p-3 leading-normal text-teal-800 dark:bg-teal-950/20 dark:text-teal-300">
              <Info className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>
                <strong>Under-the-Hood:</strong> Math is fully calculated synchronously on the main thread. Standard decoder libraries are completely bypass-isolated to achieve 60 FPS under continuous fire.
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Game Arena Grid Canvas */}
        <div className="flex flex-col lg:col-span-7">
          
          <div className="relative flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            
            {/* Health Bar Top Indicator */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Reed-Solomon ECC Scan Health
                </span>
                <span className={`rounded-md px-2 py-0.5 text-sm font-black ${
                  healthPercent > 60 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                    : healthPercent > 25 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                }`}>
                  {healthPercent}% Remaining
                </span>
              </div>
              
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div 
                  className={`h-full rounded-full transition-all duration-155 ${healthBarColor}`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>

              {/* Warnings & Alarms */}
              {healthPercent <= 30 && healthPercent > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                  <span><strong>Warning:</strong> Cumulative damage is approaching the correction limit. Scannability compromised.</span>
                </div>
              )}
            </div>

            {/* Simulated QR Play Battlefield Box */}
            <div className="relative mx-auto mb-6 flex aspect-square w-full max-w-110 items-center justify-center overflow-hidden rounded-2xl border-4 border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="size-full cursor-crosshair rounded-lg object-contain"
                aria-label="Interactive QR Code Game Board. Click or drag to execute weapon blast attacks."
              />

              {/* Complete Defeated Game-Over Screen overlay */}
              {healthPercent === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center backdrop-blur-sm transition-all duration-300">
                  <div className="mb-4 animate-bounce rounded-full bg-red-900/40 p-4 text-red-500 ring-8 ring-red-900/20">
                    <ZapOff className="size-12" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-red-500 uppercase">
                    QR Code Defeated!
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-300">
                    Cumulative damaged modules ({damagedCount}) has fully exhausted the error-correction budget. The QR code is now <strong>completely unscannable</strong>.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition-transform hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="size-4" />
                    Rebuild / Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Control Buttons */}
            <div className="mt-auto grid grid-cols-2 gap-3">
              <button
                onClick={handleReset}
                disabled={damagedCount === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-sm transition-all outline-none ${
                  damagedCount === 0
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                    : 'dark:hover:bg-slate-750 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-white'
                }`}
              >
                <Trash2 className="size-4" />
                Reset Grid
              </button>

              <button
                onClick={simulateBarrage}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
              >
                <Play className="size-4" />
                Artillery Barrage
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

/**
 * QR Code Damage Simulator Game Page Component.
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
