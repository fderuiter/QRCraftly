/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

/* eslint-disable security/detect-object-injection */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Zap, Flame, Bomb, RotateCcw, ArrowLeft, ShieldAlert, ShieldCheck, Gamepad2, Settings } from 'lucide-react';
import '@/layouts/index.css';
import { applyOpticalSimulationMath } from '../../utils/opticalSimulation';
import { isDangerousUrl } from '../../utils/security';
import { assertWorkerRequest } from '../../utils/sharedContract';
import { AdaptiveFrameScheduler } from '../../utils/AdaptiveFrameScheduler';

/**
 * Interface representing active game projectile entities (bullets or bombs).
 */
interface Projectile {
  /** X coordinate of the projectile */
  x: number;
  /** Y coordinate of the projectile */
  y: number;
  /** Velocity along X axis */
  vx: number;
  /** Velocity along Y axis */
  vy: number;
  /** Radius of the projectile rendering */
  radius: number;
  /** Damage points of the projectile */
  damage: number;
  /** Color theme of the projectile */
  color: string;
  /** Weapon sub-type */
  type: 'bullet' | 'bomb';
}

/**
 * Interface representing particle visual effects.
 */
interface Particle {
  /** Current X coordinate of the particle */
  x: number;
  /** Current Y coordinate of the particle */
  y: number;
  /** Velocity along X axis */
  vx: number;
  /** Velocity along Y axis */
  vy: number;
  /** Render radius size of the particle */
  radius: number;
  /** Opacity alpha value between 0.0 and 1.0 */
  alpha: number;
  /** Color hex code or rgb string */
  color: string;
  /** Reduction value subtracted from alpha per frame */
  decay: number;
  /** Flag to apply physical gravity pull */
  gravity?: boolean;
}

/**
 * Configurable size of micro-grid subdivision per macro QR module dimension.
 * E.g., MICRO_GRID_SIZE = 4 subdivides each macro module into a 4x4 grid of 16 sub-cells.
 */
const MICRO_GRID_SIZE = 4;

/**
 * Checks if a macro QR module coordinate (r, c) is part of a standard QR finder pattern.
 * @param r
 * @param c
 * @param size
 */
const isFinderMacro = (r: number, c: number, size: number): boolean => {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
};

/**
 * Checks if a micro-cell coordinate (mr, mc) belongs to a finder pattern macro module.
 * @param mr
 * @param mc
 * @param size
 */
const isFinderMicro = (mr: number, mc: number, size: number): boolean => {
  const r = Math.floor(mr / MICRO_GRID_SIZE);
  const c = Math.floor(mc / MICRO_GRID_SIZE);
  return isFinderMacro(r, c, size);
};

/**
 * Interactive "Destroy the QR" isolated game view component.
 * Includes user controls to modify custom text to render as a QR code,
 * an arcade blaster cannon following mouse aiming, multiple weapon choices,
 * particle blast effects, screen shaking, and synchronous main-thread scan checks.
 * @returns The rendered Page component.
 */
export default function Page() {
  // Page state for reactive UI overlays
  const [qrText, setQrText] = useState('https://qrcraftly.com');
  const [eccLevel, setEccLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [weapon, setWeapon] = useState<'bullet' | 'laser' | 'bomb'>('bullet');
  const [autoFire, setAutoFire] = useState(false);
  const [isScannable, setIsScannable] = useState(true);
  const [durability, setDurability] = useState(100);
  const [originalDarkCount, setOriginalDarkCount] = useState(0);
  const [intactDarkCount, setIntactDarkCount] = useState(0);
  const [blocksDestroyed, setBlocksDestroyed] = useState(0);
  const [decodedText, setDecodedText] = useState('https://qrcraftly.com');

  // References for non-reactive game loop mechanics to achieve full 60 FPS without React reconciliation lags
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 400, y: 300 });
  const isMouseDownRef = useRef<boolean>(false);
  
  // Game state held in refs for the animation loop
  const gameGridRef = useRef<boolean[][]>([]); // true = intact, false = destroyed (micro-cell level)
  const originalGridRef = useRef<boolean[][]>([]);
  const originalDarkCountRef = useRef<number>(0);
  const qrSizeRef = useRef<number>(21);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef<number>(0);
  const currentWeaponRef = useRef<'bullet' | 'laser' | 'bomb'>('bullet');
  const autoFireRef = useRef<boolean>(false);

  // Sync references with React state changes
  useEffect(() => {
    currentWeaponRef.current = weapon;
  }, [weapon]);

  useEffect(() => {
    autoFireRef.current = autoFire;
  }, [autoFire]);

  const qrTextRef = useRef<string>(qrText);
  useEffect(() => {
    qrTextRef.current = qrText;
  }, [qrText]);

  // Worker-Locked Offscreen Downscaling Pipeline
  const downscaleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const schedulerRef = useRef<AdaptiveFrameScheduler | null>(null);
  const isWorkerBusyRef = useRef<boolean>(false);
  const isCheckBlockedRef = useRef<boolean>(false);
  const sequenceRef = useRef<number>(0);

  // Initialize double-buffered adaptive scheduler for background scanning
  useEffect(() => {
    const scheduler = new AdaptiveFrameScheduler({
      minSamplingDelay: 16,
      maxSamplingDelay: 500,
      onStatusChange: (status) => {
        if (status === 'pass') {
          setIsScannable(true);
          setDecodedText(qrTextRef.current);
        } else if (status === 'fail') {
          setIsScannable(false);
        }
      },
    });
    scheduler.pool.resize(256, 256);
    scheduler.start();
    schedulerRef.current = scheduler;

    return () => {
      scheduler.stop();
    };
  }, []);

  // Native BarcodeDetector state and ref
  const barcodeDetectorRef = useRef<any>(null);
  const [isNativeSupported, setIsNativeSupported] = useState(false);
  const triggerWorkerCheckRef = useRef<any>(null);

  // Initialize BarcodeDetector support on application initialization
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        barcodeDetectorRef.current = detector;
        setIsNativeSupported(true);
      } catch (e) {
        console.warn('Native BarcodeDetector not supported or failed to initialize:', e);
        setIsNativeSupported(false);
      }
    }
  }, []);

  // Initialize offscreen downscaling canvas (256x256)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      downscaleCanvasRef.current = canvas;
    }
  }, []);

  const triggerWorkerCheck = useCallback(async () => {
    const canvas = canvasRef.current;
    const downscaleCanvas = downscaleCanvasRef.current;
    if (!canvas || !downscaleCanvas) return;

    const qrDisplaySize = 320;
    const qrX = (canvas.width - qrDisplaySize) / 2;
    const qrY = 100;

    const currentSequence = String(++sequenceRef.current);

    // Lock checker state
    isWorkerBusyRef.current = true;
    isCheckBlockedRef.current = false;

    // Check if asynchronous native browser bitmap generation is supported
    if (typeof globalThis.createImageBitmap === 'function') {
      try {
        const imageBitmap = await createImageBitmap(canvas, qrX, qrY, qrDisplaySize, qrDisplaySize, {
          resizeWidth: 256,
          resizeHeight: 256,
          resizeQuality: 'high'
        });

        // Abort if a newer check has been triggered
        if (currentSequence !== String(sequenceRef.current)) {
          imageBitmap.close();
          return;
        }

        const worker = workerRef.current;
        if (!worker) {
          imageBitmap.close();
          isWorkerBusyRef.current = false;
          return;
        }

        const payload = {
          imageBitmap,
          width: 256,
          height: 256,
          isTest: !!navigator.webdriver,
          configId: currentSequence
        };

        // Zero-copy transfer of ImageBitmap
        worker.postMessage(payload, [payload.imageBitmap]);
        return;
      } catch (err) {
        console.error('Async createImageBitmap failed, falling back to synchronous draw:', err);
      }
    }

    // FALLBACK: Synchronous canvas downscaling and pixel extraction
    const dctx = downscaleCanvas.getContext('2d');
    if (!dctx) {
      isWorkerBusyRef.current = false;
      return;
    }

    dctx.clearRect(0, 0, 256, 256);
    dctx.drawImage(
      canvas,
      qrX,
      qrY,
      qrDisplaySize,
      qrDisplaySize,
      0,
      0,
      256,
      256
    );

    try {
      const imgData = dctx.getImageData(0, 0, 256, 256);

      // Check if native BarcodeDetector is available
      if (barcodeDetectorRef.current) {
        try {
          // Pass 1: Digital check
          const barcodes = await barcodeDetectorRef.current.detect(imgData);
          let success = false;
          let _physicalReady = false;

          if (barcodes && barcodes.length > 0) {
            const decodedData = barcodes[0].rawValue;
            if (!isDangerousUrl(decodedData)) {
              success = true;

              // Pass 2: Physical/Optical Check
              const isTest = !!navigator.webdriver;
              let simulatedImageData: ImageData;
              if (isTest) {
                simulatedImageData = imgData;
              } else {
                const simulatedPixels = applyOpticalSimulationMath(imgData.data, 256, 256);
                simulatedImageData = new ImageData(simulatedPixels, 256, 256);
              }

              const simulatedBarcodes = await barcodeDetectorRef.current.detect(simulatedImageData);
              if (simulatedBarcodes && simulatedBarcodes.length > 0) {
                _physicalReady = true;
              }
            }
          }

          // Apply state updates identically to worker onmessage
          if (success) {
            setIsScannable(true);
            setDecodedText(qrTextRef.current);
          } else {
            setIsScannable(false);
          }

          // Release lock
          isWorkerBusyRef.current = false;

          // Perform a final "catch-up" check if paint inputs ceased and a check was blocked
          if (isCheckBlockedRef.current && !isMouseDownRef.current && !autoFireRef.current) {
            triggerWorkerCheckRef.current?.();
          }
          return;
        } catch (nativeErr) {
          console.error('Native BarcodeDetector failed, falling back to Web Worker:', nativeErr);
          // fall through to fallback worker code below
        }
      }

      // Fallback: off-thread Web Worker pipeline with double-buffered memory pool recycling
      const worker = workerRef.current;
      if (!worker) {
        isWorkerBusyRef.current = false;
        return;
      }

      const isTest = !!navigator.webdriver;
      const configId = currentSequence;
      const scheduler = schedulerRef.current;
      const seqId = scheduler ? scheduler.beginFrame() : null;
      const buffer = scheduler ? scheduler.pool.acquire() : new ArrayBuffer(256 * 256 * 4);
      const u8 = new Uint8ClampedArray(buffer);
      u8.set(imgData.data);

      const payload = {
        imageData: { data: u8, width: 256, height: 256 },
        buffer: buffer,
        width: 256,
        height: 256,
        isTest,
        configId,
        sequenceId: seqId !== null ? seqId : undefined,
      };
      assertWorkerRequest(payload);

      // Zero-copy array buffer transfer
      worker.postMessage(payload, [buffer]);
    } catch (err) {
      console.error('Failed to capture or send downscaled canvas data to worker/detector:', err);
      isWorkerBusyRef.current = false;
    }
  }, []);

  // Update triggerWorkerCheckRef on change to resolve recursive dependency cycle cleanly
  useEffect(() => {
    triggerWorkerCheckRef.current = triggerWorkerCheck;
  }, [triggerWorkerCheck]);

  // Initialize background scannability validation worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const worker = new Worker(new URL('../../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        worker.onmessage = (e) => {
          const { success, configId, sequenceId, buffer: recycledBuffer } = e.data;

          if (schedulerRef.current && typeof sequenceId === 'number') {
            schedulerRef.current.endFrame(
              sequenceId,
              success ? 'pass' : 'fail',
              success ? qrTextRef.current : null,
              e.data.error,
              recycledBuffer
            );
          } else if (recycledBuffer && schedulerRef.current) {
            schedulerRef.current.pool.release(recycledBuffer);
          }
          
          if (configId !== undefined && configId !== String(sequenceRef.current)) {
            return;
          }

          if (success) {
            setIsScannable(true);
            setDecodedText(qrTextRef.current);
          } else {
            setIsScannable(false);
          }

          // Release the worker lock
          isWorkerBusyRef.current = false;

          // Perform a final "catch-up" check if paint inputs ceased and a check was blocked
          if (isCheckBlockedRef.current && !isMouseDownRef.current && !autoFireRef.current) {
            triggerWorkerCheck();
          }
        };

        return () => {
          worker.terminate();
        };
      } catch (err) {
        console.error('Failed to initialize scannability worker:', err);
      }
    }
  }, [triggerWorkerCheck]);

  /**
   * Constructs the QR code micro-grid matrix from a text string and error correction tier, updating game loop data structures.
   */
  const setupQRMatrix = useCallback((textValue: string, level: 'L' | 'M' | 'Q' | 'H' = eccLevel) => {
    try {
      const qr = QRCode.create(textValue, { errorCorrectionLevel: level });
      const macroSize = qr.modules.size;
      qrSizeRef.current = macroSize;

      const totalMicroSize = macroSize * MICRO_GRID_SIZE;
      const grid: boolean[][] = [];
      const orig: boolean[][] = [];
      let darkMicroCount = 0;

      for (let mr = 0; mr < totalMicroSize; mr++) {
        const rowGrid: boolean[] = [];
        const rowOrig: boolean[] = [];
        const r = Math.floor(mr / MICRO_GRID_SIZE);
        for (let mc = 0; mc < totalMicroSize; mc++) {
          const c = Math.floor(mc / MICRO_GRID_SIZE);
          const isDark = !!qr.modules.get(r, c);
          rowGrid.push(isDark);
          rowOrig.push(isDark);
          if (isDark) {
            darkMicroCount++;
          }
        }
        grid.push(rowGrid);
        orig.push(rowOrig);
      }

      gameGridRef.current = grid;
      originalGridRef.current = orig;
      originalDarkCountRef.current = darkMicroCount;
      setOriginalDarkCount(darkMicroCount);
      setIntactDarkCount(darkMicroCount);
      setBlocksDestroyed(0);
      setDurability(100);
      setIsScannable(true);
      setDecodedText(textValue);
      projectilesRef.current = [];
      particlesRef.current = [];
      isWorkerBusyRef.current = false;
      isCheckBlockedRef.current = false;
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [eccLevel]);

  // Set up QR Code on Mount, text change, or error correction level change
  useEffect(() => {
    setupQRMatrix(qrText, eccLevel);
  }, [qrText, eccLevel, setupQRMatrix]);

  /**
   * Triggers micro-grid durability statistics calculations and background worker scannability checking.
   */
  const scanQRState = useCallback(() => {
    const grid = gameGridRef.current;
    const macroSize = qrSizeRef.current;
    const totalMicroSize = macroSize * MICRO_GRID_SIZE;
    if (grid.length === 0) return;

    // Calculate micro-cell durability statistics synchronously on the main thread (lightweight matrix iteration)
    const origGrid = originalGridRef.current;
    let currentIntact = 0;
    let destroyed = 0;
    for (let mr = 0; mr < totalMicroSize; mr++) {
      for (let mc = 0; mc < totalMicroSize; mc++) {
        if (origGrid[mr][mc]) {
          if (grid[mr][mc]) {
            currentIntact++;
          } else {
            destroyed++;
          }
        }
      }
    }

    setIntactDarkCount(currentIntact);
    setBlocksDestroyed(destroyed);
    
    const origDarkTotal = originalDarkCountRef.current;
    const currentDurability = origDarkTotal > 0 ? (currentIntact / origDarkTotal) * 100 : 0;
    setDurability(Math.round(currentDurability));

    // Lock scannability evaluations if a worker job is already active
    if (isWorkerBusyRef.current) {
      isCheckBlockedRef.current = true;
      return;
    }

    // Trigger the background worker-locked offscreen downscaling pipeline
    triggerWorkerCheck();
  }, [triggerWorkerCheck]);

  /**
   * Fires a single fast plasma bolt.
   */
  const fireBullet = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cannonX = canvas.width / 2;
    const cannonY = canvas.height - 30;
    const targetX = mousePosRef.current.x;
    const targetY = mousePosRef.current.y;

    const dx = targetX - cannonX;
    const dy = targetY - cannonY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const speed = 14;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;

    projectilesRef.current.push({
      x: cannonX,
      y: cannonY,
      vx,
      vy,
      radius: 5,
      damage: 1,
      color: '#2dd4bf', // Teal glow
      type: 'bullet'
    });

    // Small micro screen shake on fire
    screenShakeRef.current = Math.min(screenShakeRef.current + 1.2, 5);
  }, []);

  /**
   * Fires an explosive antimatter rocket.
   */
  const fireBomb = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cannonX = canvas.width / 2;
    const cannonY = canvas.height - 30;
    const targetX = mousePosRef.current.x;
    const targetY = mousePosRef.current.y;

    const dx = targetX - cannonX;
    const dy = targetY - cannonY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const speed = 8;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;

    projectilesRef.current.push({
      x: cannonX,
      y: cannonY,
      vx,
      vy,
      radius: 12,
      damage: 1,
      color: '#fb7185', // Rose/Red glow
      type: 'bomb'
    });

    screenShakeRef.current = Math.min(screenShakeRef.current + 3.5, 8);
  }, []);

  /**
   * Decides which weapon to trigger firing based on current weapon config.
   */
  const handleShoot = useCallback(() => {
    const activeWeapon = currentWeaponRef.current;
    if (activeWeapon === 'bullet') {
      fireBullet();
    } else if (activeWeapon === 'bomb') {
      // Limit rocket frequency to prevent overloading the screen with slow rockets
      const bombCount = projectilesRef.current.filter(p => p.type === 'bomb').length;
      if (bombCount < 3) {
        fireBomb();
      }
    }
  }, [fireBullet, fireBomb]);

  // Main high-performance Animation Loop
  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const loop = () => {
      if (!active || !canvasRef.current) return;
      tick++;

      // Canvas clearing with a premium tech-dark theme
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b1329';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save drawing state for screen shake effects
      ctx.save();
      const currentShake = screenShakeRef.current;
      if (currentShake > 0.05) {
        const dx = (Math.random() - 0.5) * currentShake;
        const dy = (Math.random() - 0.5) * currentShake;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.92; // rapid decay
      }

      // 1. Render Grid Guidelines & HUD background elements
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // QR Code boundaries in canvas viewport
      const qrDisplaySize = 320;
      const qrX = (canvas.width - qrDisplaySize) / 2;
      const qrY = 100;
      const macroSize = qrSizeRef.current;
      const totalMicroSize = macroSize * MICRO_GRID_SIZE;
      const microCellScreenSize = qrDisplaySize / totalMicroSize;

      const grid = gameGridRef.current;
      const origGrid = originalGridRef.current;

      // Draw standard glowing border around the QR area
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(13, 148, 136, 0.3)';
      ctx.strokeStyle = 'rgba(13, 148, 136, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 10, qrY - 10, qrDisplaySize + 20, qrDisplaySize + 20);
      ctx.shadowBlur = 0; // reset glow

      // 2. Draw QR code micro-cells
      if (grid.length > 0) {
        for (let mr = 0; mr < totalMicroSize; mr++) {
          for (let mc = 0; mc < totalMicroSize; mc++) {
            const mX = qrX + mc * microCellScreenSize;
            const mY = qrY + mr * microCellScreenSize;
            const isFinder = isFinderMicro(mr, mc, macroSize);

            if (grid[mr][mc]) {
              // Micro-cell is intact - make it glow if it's a finder pattern or standard
              if (isFinder) {
                // High-glowing cyan style for critical scanner eyes
                ctx.fillStyle = '#06b6d4'; // bright cyan
                ctx.fillRect(mX, mY, microCellScreenSize, microCellScreenSize);
              } else {
                // Standard cyber micro-cell style
                ctx.fillStyle = '#14b8a6'; // real teal
                ctx.fillRect(mX, mY, microCellScreenSize, microCellScreenSize);
              }
            } else if (origGrid[mr][mc]) {
              // Originally dark micro-cell, now beautifully blasted away
              ctx.fillStyle = 'rgba(241, 245, 249, 0.05)';
              ctx.fillRect(mX, mY, microCellScreenSize, microCellScreenSize);
            }
          }
        }
      }

      // 3. Laser Weapon Continuous Damage processing
      const cannonX = canvas.width / 2;
      const cannonY = canvas.height - 30;
      const targetX = mousePosRef.current.x;
      const targetY = mousePosRef.current.y;

      if (currentWeaponRef.current === 'laser' && isMouseDownRef.current) {
        // Render giant plasma burn laser
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ccfbf1';
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 6 + Math.sin(tick * 0.4) * 3;
        
        ctx.beginPath();
        ctx.moveTo(cannonX, cannonY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Laser core beam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 + Math.sin(tick * 0.4) * 1;
        ctx.beginPath();
        ctx.moveTo(cannonX, cannonY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.restore();

        // Burn endpoint dust explosion
        if (tick % 2 === 0) {
          for (let i = 0; i < 4; i++) {
            particlesRef.current.push({
              x: targetX,
              y: targetY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              radius: 1.5 + Math.random() * 2,
              alpha: 1.0,
              color: '#2dd4bf',
              decay: 0.04 + Math.random() * 0.04,
              gravity: true
            });
          }
        }

        // Apply continuous laser damage to micro-cells under cursor
        const laserBurnRadius = 10; // pixels
        const lMinCol = Math.max(0, Math.floor((targetX - laserBurnRadius - qrX) / microCellScreenSize));
        const lMaxCol = Math.min(totalMicroSize - 1, Math.floor((targetX + laserBurnRadius - qrX) / microCellScreenSize));
        const lMinRow = Math.max(0, Math.floor((targetY - laserBurnRadius - qrY) / microCellScreenSize));
        const lMaxRow = Math.min(totalMicroSize - 1, Math.floor((targetY + laserBurnRadius - qrY) / microCellScreenSize));

        let updated = false;

        for (let tr = lMinRow; tr <= lMaxRow; tr++) {
          for (let tc = lMinCol; tc <= lMaxCol; tc++) {
            if (grid[tr] && grid[tr][tc] && origGrid[tr][tc]) {
              if (isFinderMicro(tr, tc, macroSize)) continue; // Finder pattern protection

              const cellX = qrX + (tc + 0.5) * microCellScreenSize;
              const cellY = qrY + (tr + 0.5) * microCellScreenSize;
              const dX = targetX - cellX;
              const dY = targetY - cellY;
              const distSq = dX * dX + dY * dY;

              if (distSq <= laserBurnRadius * laserBurnRadius) {
                grid[tr][tc] = false;
                updated = true;

                for (let k = 0; k < 2; k++) {
                  particlesRef.current.push({
                    x: cellX,
                    y: cellY,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    radius: 1 + Math.random() * 2,
                    alpha: 1.0,
                    color: '#2dd4bf',
                    decay: 0.03 + Math.random() * 0.04,
                    gravity: true
                  });
                }
              }
            }
          }
        }

        if (updated) {
          screenShakeRef.current = Math.min(screenShakeRef.current + 0.8, 4);
          scanQRState();
        }
      } else {
        // Draw standard faint dashed aiming guide
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(cannonX, cannonY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]); // reset
      }

      // Auto-firing process (Bullets only)
      if (autoFireRef.current && currentWeaponRef.current === 'bullet' && tick % 5 === 0) {
        fireBullet();
      }

      // 4. Update and Draw Projectiles
      const projectiles = projectilesRef.current;
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Render projectile glows
        ctx.save();
        ctx.shadowBlur = p.type === 'bomb' ? 18 : 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Spark engine trail
        if (tick % 2 === 0) {
          particlesRef.current.push({
            x: p.x,
            y: p.y,
            vx: -p.vx * 0.2 + (Math.random() - 0.5) * 2,
            vy: -p.vy * 0.2 + (Math.random() - 0.5) * 2,
            radius: p.radius * 0.35,
            alpha: 0.8,
            color: p.color,
            decay: 0.04,
            gravity: false
          });
        }

        // Boundary deletion
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
          projectiles.splice(i, 1);
          continue;
        }

        // Micro-grid collision checking
        let projectileHit = false;

        if (p.type === 'bullet') {
          const minCol = Math.max(0, Math.floor((p.x - p.radius - qrX) / microCellScreenSize));
          const maxCol = Math.min(totalMicroSize - 1, Math.floor((p.x + p.radius - qrX) / microCellScreenSize));
          const minRow = Math.max(0, Math.floor((p.y - p.radius - qrY) / microCellScreenSize));
          const maxRow = Math.min(totalMicroSize - 1, Math.floor((p.y + p.radius - qrY) / microCellScreenSize));

          for (let mr = minRow; mr <= maxRow; mr++) {
            for (let mc = minCol; mc <= maxCol; mc++) {
              if (grid[mr] && grid[mr][mc] && origGrid[mr][mc]) {
                const mX = qrX + mc * microCellScreenSize;
                const mY = qrY + mr * microCellScreenSize;

                const closestX = Math.max(mX, Math.min(p.x, mX + microCellScreenSize));
                const closestY = Math.max(mY, Math.min(p.y, mY + microCellScreenSize));
                const distX = p.x - closestX;
                const distY = p.y - closestY;

                if (distX * distX + distY * distY < p.radius * p.radius) {
                  projectileHit = true;
                  if (!isFinderMicro(mr, mc, macroSize)) {
                    grid[mr][mc] = false;
                  }

                  for (let k = 0; k < 6; k++) {
                    particlesRef.current.push({
                      x: p.x,
                      y: p.y,
                      vx: (Math.random() - 0.5) * 8 + p.vx * 0.25,
                      vy: (Math.random() - 0.5) * 8 + p.vy * 0.25,
                      radius: 1 + Math.random() * 2.5,
                      alpha: 1.0,
                      color: '#2dd4bf',
                      decay: 0.03 + Math.random() * 0.03,
                      gravity: true
                    });
                  }
                  screenShakeRef.current = Math.min(screenShakeRef.current + 3.5, 9);
                  scanQRState();
                }
              }
            }
            if (projectileHit) break;
          }
        } else if (p.type === 'bomb') {
          // Check collision with any intact micro-cell first
          const minCol = Math.max(0, Math.floor((p.x - p.radius - qrX) / microCellScreenSize));
          const maxCol = Math.min(totalMicroSize - 1, Math.floor((p.x + p.radius - qrX) / microCellScreenSize));
          const minRow = Math.max(0, Math.floor((p.y - p.radius - qrY) / microCellScreenSize));
          const maxRow = Math.min(totalMicroSize - 1, Math.floor((p.y + p.radius - qrY) / microCellScreenSize));

          for (let mr = minRow; mr <= maxRow; mr++) {
            for (let mc = minCol; mc <= maxCol; mc++) {
              if (grid[mr] && grid[mr][mc] && origGrid[mr][mc]) {
                const mX = qrX + mc * microCellScreenSize;
                const mY = qrY + mr * microCellScreenSize;

                const closestX = Math.max(mX, Math.min(p.x, mX + microCellScreenSize));
                const closestY = Math.max(mY, Math.min(p.y, mY + microCellScreenSize));
                const distX = p.x - closestX;
                const distY = p.y - closestY;

                if (distX * distX + distY * distY < p.radius * p.radius) {
                  projectileHit = true;
                  break;
                }
              }
            }
            if (projectileHit) break;
          }

          if (projectileHit) {
            // Massive radius explosive antimatter breach
            const blastRadius = 55; // pixels
            const bMinCol = Math.max(0, Math.floor((p.x - blastRadius - qrX) / microCellScreenSize));
            const bMaxCol = Math.min(totalMicroSize - 1, Math.floor((p.x + blastRadius - qrX) / microCellScreenSize));
            const bMinRow = Math.max(0, Math.floor((p.y - blastRadius - qrY) / microCellScreenSize));
            const bMaxRow = Math.min(totalMicroSize - 1, Math.floor((p.y + blastRadius - qrY) / microCellScreenSize));

            for (let br = bMinRow; br <= bMaxRow; br++) {
              for (let bc = bMinCol; bc <= bMaxCol; bc++) {
                if (grid[br] && grid[br][bc] && origGrid[br][bc]) {
                  if (isFinderMicro(br, bc, macroSize)) continue; // Finder pattern protection!

                  const cellX = qrX + (bc + 0.5) * microCellScreenSize;
                  const cellY = qrY + (br + 0.5) * microCellScreenSize;

                  const dX = p.x - cellX;
                  const dY = p.y - cellY;
                  if (dX * dX + dY * dY < blastRadius * blastRadius) {
                    grid[br][bc] = false;

                    for (let s = 0; s < 2; s++) {
                      particlesRef.current.push({
                        x: cellX,
                        y: cellY,
                        vx: (Math.random() - 0.5) * 9,
                        vy: (Math.random() - 0.5) * 9,
                        radius: 1.5 + Math.random() * 3,
                        alpha: 1.0,
                        color: Math.random() > 0.4 ? '#f43f5e' : '#fb923c',
                        decay: 0.02 + Math.random() * 0.03,
                        gravity: true
                      });
                    }
                  }
                }
              }
            }

            for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
              const speedMultiplier = 4 + Math.random() * 5;
              particlesRef.current.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(angle) * speedMultiplier,
                vy: Math.sin(angle) * speedMultiplier,
                radius: 2 + Math.random() * 3,
                alpha: 1.0,
                color: '#fb7185',
                decay: 0.025,
                gravity: false
              });
            }

            screenShakeRef.current = Math.min(screenShakeRef.current + 18, 25);
            scanQRState();
          }
        }

        if (projectileHit) {
          scanQRState();
          projectiles.splice(i, 1);
        }
      }

      // 5. Update and Draw Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pt.gravity) {
          pt.vy += 0.12; // slow falling gravity sparks
        }

        pt.alpha -= pt.decay;

        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Draw Reticle/Aiming Ring at cursor
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 12 + Math.sin(tick * 0.15) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Outer targeting brackets
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.restore();

      // 7. Draw swivelling arcade Cannon Turret at bottom-center
      const swivelAngle = Math.atan2(targetY - cannonY, targetX - cannonX);
      ctx.save();
      ctx.translate(cannonX, cannonY);
      ctx.rotate(swivelAngle);

      // Neon-glowing cyber core base of cannon
      const cannonGradient = ctx.createLinearGradient(-15, -10, 35, 10);
      cannonGradient.addColorStop(0, '#1e293b');
      cannonGradient.addColorStop(1, '#0f172a');

      // Draw cannon barrel
      ctx.fillStyle = cannonGradient;
      ctx.strokeStyle = weapon === 'bullet' ? '#2dd4bf' : (weapon === 'laser' ? '#2dd4bf' : '#fb7185');
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-5, -8, 42, 16);
      ctx.fillRect(-5, -8, 42, 16);

      // Barrel tip core
      ctx.fillStyle = weapon === 'bullet' ? '#2dd4bf' : (weapon === 'laser' ? '#2dd4bf' : '#fb7185');
      ctx.fillRect(35, -5, 4, 10);
      ctx.restore();

      // Cannon base pod (glowing capsule)
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0d9488';
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cannonX, cannonY + 12, 25, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // restore screenshake translations

      // Check if paint inputs have ceased and a check was blocked
      if (isCheckBlockedRef.current && !isWorkerBusyRef.current && !isMouseDownRef.current && !autoFireRef.current) {
        triggerWorkerCheck();
      }

      // Schedule next frame
      if (active && typeof requestAnimationFrame === 'function') {
        animationFrameIdRef.current = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      animationFrameIdRef.current = requestAnimationFrame(loop);
    }

    return () => {
      active = false;
      if (animationFrameIdRef.current && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [weapon, fireBullet, scanQRState, triggerWorkerCheck]);

  // Keybindings for weapon switcher & spacebar firing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser space scroll
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleShoot();
      }
      if (e.key === '1') {
        setWeapon('bullet');
      }
      if (e.key === '2') {
        setWeapon('laser');
      }
      if (e.key === '3') {
        setWeapon('bomb');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleShoot]);

  const durabilityBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (durabilityBarRef.current) {
      durabilityBarRef.current.style.width = `${durability}%`;
    }
  }, [durability]);

  /**
   * Updates coordinates of the mouse on move relative to canvas size.
   * @param e The mouse event object.
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mousePosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    if (isMouseDownRef.current) {
      scanQRState();
    }
  };

  /**
   * Tracks mouse triggers to active shot bursts.
   * @param e The mouse event object.
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Left click only
    isMouseDownRef.current = true;
    handleShoot();
    scanQRState();
  };

  /**
   * Release triggers on mouse release.
   */
  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  /**
   * Handle mouse escape from bounds.
   */
  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  /**
   * Restores intact state of all generated blocks.
   */
  const handleReset = () => {
    setupQRMatrix(qrText, eccLevel);
  };

  return (
    <div className="dark flex min-h-screen flex-col overflow-x-hidden bg-slate-950 font-sans text-slate-100 antialiased select-none">
      {/* Upper Navigation Header */}
      <header className="z-10 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-teal-400 shadow-md transition-all hover:bg-slate-800 hover:text-teal-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Generator</span>
          </a>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-5 animate-pulse text-teal-400" />
            <h1 className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              Destroy the QR!
            </h1>
          </div>
        </div>
        <div className="hidden items-center gap-4 text-xs text-slate-500 md:flex">
          <span>🎮 High-Performance Arcade Sandbox</span>
          <span>{isNativeSupported ? '⚡ Hardware-Accelerated Native Decoding' : '⚙️ Web Worker Fallback Decoding'}</span>
        </div>
      </header>

      {/* Main Sandbox Grid */}
      <main className="mx-auto grid w-full max-w-350 flex-1 grid-cols-1 items-start gap-6 px-4 py-6 xl:grid-cols-12">
        {/* Left Control Panel: Configurations & Weapon Selection (Col span 3) */}
        <div className="flex h-full flex-col gap-5 xl:col-span-3">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-900 bg-slate-900/40 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <Settings className="size-4 text-teal-400" />
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Configuration</h2>
            </div>

            {/* Input QR Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="qr-target-text" className="text-xs font-semibold text-slate-400">
                Target QR Content
              </label>
              <input
                id="qr-target-text"
                type="text"
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                maxLength={120}
                placeholder="Enter text to test..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-100 placeholder-slate-600 shadow-inner transition-colors focus:border-teal-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                Generates standard QR blocks dynamically. Longer strings raise QR version/complexity.
              </p>
            </div>

            {/* Reed-Solomon Error Correction Selector */}
            <div className="flex flex-col gap-1.5">
              <span id="ecc-level-label" className="text-xs font-semibold text-slate-400">
                Error Correction Level
              </span>
              <div role="group" aria-labelledby="ecc-level-label" className="grid grid-cols-4 gap-2">
                {(['L', 'M', 'Q', 'H'] as const).map((level) => {
                  const isActive = eccLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setEccLevel(level)}
                      className={`rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                        isActive
                          ? 'border-teal-500 bg-teal-950/60 text-teal-300 shadow-md ring-1 ring-teal-500/30'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                {eccLevel === 'L' && 'Tier L (~7% redundancy recovery)'}
                {eccLevel === 'M' && 'Tier M (~15% redundancy recovery)'}
                {eccLevel === 'Q' && 'Tier Q (~25% redundancy recovery)'}
                {eccLevel === 'H' && 'Tier H (~30% redundancy recovery)'}
              </p>
            </div>

            {/* Preset Options */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Content Presets</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'QRCraftly', val: 'https://qrcraftly.com' },
                  { label: 'Secret Text', val: 'PROMO_CODE_BLASTED_SURVIVAL' },
                  { label: 'Arcade Mode', val: 'ARCADE_SANDBOX_STATION_ALPHA' },
                  { label: 'WiFi Hotspot', val: 'WIFI:S:DurabilityTest;T:WPA;P:SuperSecure123;;' }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQrText(preset.val)}
                    className="rounded-lg border border-slate-900 bg-slate-950 px-3 py-1.5 text-left text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weapon Arsenal */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-900 bg-slate-900/40 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <Zap className="size-4 text-teal-400" />
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Blaster Weapons</h2>
            </div>

            {/* Weapon Selector Blocks */}
            <div className="flex flex-col gap-2.5">
              {[
                {
                  id: 'bullet',
                  name: 'Plasma Blaster',
                  desc: 'Fires high-speed concentrated energy bolts. Single block targeting.',
                  icon: Zap,
                  color: 'text-teal-400 border-teal-500/30 hover:border-teal-400/50',
                  activeColor: 'bg-teal-950/40 border-teal-500 text-teal-300 ring-1 ring-teal-500/20'
                },
                {
                  id: 'laser',
                  name: 'Thermal Laser',
                  desc: 'Emits a persistent thermal cutting beam directly on aiming vector.',
                  icon: Flame,
                  color: 'text-cyan-400 border-cyan-500/30 hover:border-cyan-400/50',
                  activeColor: 'bg-cyan-950/40 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/20'
                },
                {
                  id: 'bomb',
                  name: 'Antimatter Rocket',
                  desc: 'Launches heavy rockets. Detonates on impact inside a massive breach radius.',
                  icon: Bomb,
                  color: 'text-rose-400 border-rose-500/30 hover:border-rose-400/50',
                  activeColor: 'bg-rose-950/40 border-rose-500 text-rose-300 ring-1 ring-rose-500/20'
                }
              ].map((w) => {
                const isActive = weapon === w.id;
                const Icon = w.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWeapon(w.id as any)}
                    className={`group w-full rounded-xl border p-3 text-left transition-all ${
                      isActive ? w.activeColor : 'border-slate-900 bg-slate-950 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2.5">
                      <Icon className={`size-4 ${isActive ? '' : w.color}`} />
                      <span className="text-xs font-bold">{w.name}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-500 transition-colors group-hover:text-slate-400">
                      {w.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Auto Fire Switch */}
            <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-900 bg-slate-950 p-3.5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-300">Rapid Auto-Fire</span>
                <span className="text-[10px] text-slate-500">Hold trigger for Bullet weapon</span>
              </div>
              <button
                role="switch"
                aria-checked={autoFire}
                onClick={() => setAutoFire(!autoFire)}
                className={`relative inline-flex size-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-1 focus:ring-teal-500 focus:outline-none ${
                  autoFire ? 'bg-teal-600' : 'bg-slate-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoFire ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Center Panel: Arcade Screen & Controls Instruction (Col span 6) */}
        <div className="flex flex-col items-center gap-4 xl:col-span-6">
          {/* Main Gameplay Screen Wrapper */}
          <div className="group relative max-w-full overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-950 p-2 shadow-2xl shadow-teal-500/5">
            {/* Corner Bracket Details */}
            <div className="absolute top-0 left-0 m-3 size-4 border-t-2 border-l-2 border-teal-500/30 transition-colors group-hover:border-teal-400" />
            <div className="absolute top-0 right-0 m-3 size-4 border-t-2 border-r-2 border-teal-500/30 transition-colors group-hover:border-teal-400" />
            <div className="absolute bottom-0 left-0 m-3 size-4 border-b-2 border-l-2 border-teal-500/30 transition-colors group-hover:border-teal-400" />
            <div className="absolute right-0 bottom-0 m-3 size-4 border-r-2 border-b-2 border-teal-500/30 transition-colors group-hover:border-teal-400" />

            {/* Main Interactive Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="block max-w-full cursor-none rounded-lg border border-slate-900 bg-[#0b1329] shadow-inner"
            />
          </div>

          {/* On-Screen Console Controls Footer */}
          <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-900/60 bg-slate-900/20 px-5 py-3 text-xs text-slate-400 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-slate-300">Mouse Move</span>
              <span>Aim Blaster</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-slate-300">Left Click / Space</span>
              <span>Trigger Blaster Shots</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-slate-300">1, 2, 3</span>
              <span>Equip Weaponry</span>
            </div>
          </div>
        </div>

        {/* Right Dashboard Panel: Scanner HUD & Readouts (Col span 3) */}
        <div className="flex h-full flex-col gap-5 xl:col-span-3">
          {/* Readability Assessment */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-900 bg-slate-900/40 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <ShieldCheck className="size-4 text-teal-400" />
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Live QR Scannability</h2>
            </div>

            {/* Scannable Pulse Status */}
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-6 shadow-inner">
              {isScannable ? (
                <>
                  {/* Pulsing backdrop ring */}
                  <div className="absolute inset-0 animate-ping rounded-xl bg-teal-500/5 duration-1000" />
                  <div className="mb-3 rounded-full border border-teal-500/30 bg-teal-950/60 p-4 text-teal-400 shadow-lg shadow-teal-500/10">
                    <ShieldCheck className="size-8" />
                  </div>
                  <span className="text-sm font-black tracking-widest text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">
                    SCANNABLE
                  </span>
                  <span className="mt-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    Code Decoded Correctly
                  </span>
                </>
              ) : (
                <>
                  <div className="mb-3 animate-pulse rounded-full border border-rose-500/30 bg-rose-950/60 p-4 text-rose-400 shadow-lg shadow-rose-500/10">
                    <ShieldAlert className="size-8" />
                  </div>
                  <span className="text-sm font-black tracking-widest text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                    CORRUPTED
                  </span>
                  <span className="mt-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    Scan Broken / Unreadable
                  </span>
                </>
              )}
            </div>

            {/* Decoded Output Field */}
            <div className="flex flex-col gap-1 rounded-xl border border-slate-900 bg-slate-950 p-3.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Live Readout</span>
              <div className="truncate font-mono text-xs font-semibold text-slate-300">
                {isScannable ? decodedText : <span className="text-rose-500/70 italic">[No data decoded]</span>}
              </div>
            </div>
          </div>

          {/* Durability score card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-900 bg-slate-900/40 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <Gamepad2 className="size-4 text-teal-400" />
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Durability Index</h2>
            </div>

            {/* Score layout */}
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-400">Survival rate</span>
                <span className="font-mono text-3xl font-black tracking-tight text-teal-400">
                  {durability}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full border border-slate-900 bg-slate-950 p-0.5 shadow-inner">
                <div
                  ref={durabilityBarRef}
                  className={`h-full rounded-full transition-all duration-100 ${
                    durability > 70
                      ? 'bg-gradient-to-r from-teal-500 to-teal-400'
                      : durability > 30
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-rose-400'
                  }`}
                />
              </div>

              {/* Counts */}
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-900 bg-slate-950 p-3 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Intact Micro-Cells</span>
                  <span className="font-mono text-base font-extrabold text-slate-200">
                    {intactDarkCount} / {originalDarkCount}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-950 p-3 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Blasted Away</span>
                  <span className="font-mono text-base font-extrabold text-slate-200">
                    {blocksDestroyed}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-2 flex flex-col gap-2">
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-500/30 bg-teal-900/20 px-4 py-2.5 text-xs font-semibold tracking-wide text-teal-400 shadow-md transition-all hover:border-teal-500/50 hover:bg-teal-900/30 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <RotateCcw className="size-3.5" />
                <span>HEAL QR CODE</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
