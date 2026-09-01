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
    along with this program.  If not, see <https://resources.gnu.org/licenses/>.
*/

import { QRConfig } from '../types';
import { ValidationEngine } from '../engine/ValidationEngine';
import { assertWorkerRequest, assertWorkerResponse, isWorkerResponse } from '../utils/sharedContract';
import { SignalBus, globalSignalBus } from './SignalBus';

export type ScannabilityStatus = 'idle' | 'checking' | 'digital-pass' | 'physical-pass' | 'fail';

export interface HealthScore {
  score: number;
  warnings: string[];
}

export interface CheckScannabilityOptions {
  config: QRConfig;
  engine?: string;
  canvas?: HTMLCanvasElement | null;
  overrideImageData?: ImageData;
  overrideImageBitmap?: ImageBitmap;
  overrideModuleCount?: number;
}

const releaseImageHandle = (handle: any) => {
  if (handle && typeof handle.close === 'function') {
    try {
      handle.close();
    } catch {}
  }
};

/**
 * Framework-agnostic background service module for optical scannability worker checks,
 * canvas transfers, latency backpressure throttling (<16ms frame budget), and automatic
 * main-thread fallback recovery on worker timeout or crash.
 */
export class ScannabilityService {
  private bus: SignalBus;
  private worker: Worker | null = null;
  private workerUnsupported = false;
  private isWorkerBusy = false;
  private lastLatency = 0;
  private startTime: number | null = null;
  private sequenceId = 0;
  private status: ScannabilityStatus = 'idle';
  private workerRecoveryActive = false;
  private watchdogTimeoutTimer: any = null;
  private localMetrics?: { violations?: number; minContrast?: number };

  constructor(bus: SignalBus = globalSignalBus) {
    this.bus = bus;
  }

  public getStatus(): ScannabilityStatus {
    return this.status;
  }

  public isRecoveryActive(): boolean {
    return this.workerRecoveryActive;
  }

  public getHealth(config: QRConfig): HealthScore {
    return ValidationEngine.calculateScannability(config, this.localMetrics);
  }

  private clearWatchdog() {
    if (this.watchdogTimeoutTimer) {
      clearTimeout(this.watchdogTimeoutTimer);
      this.watchdogTimeoutTimer = null;
    }
  }

  private handleError(err: any, config: QRConfig, engine = 'browser') {
    console.error('[ScannabilityService] Worker error, activating main-thread fallback:', err);
    this.clearWatchdog();
    this.status = 'fail';
    this.workerRecoveryActive = true;
    this.isWorkerBusy = false;
    this.startTime = null;

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }

    this.bus.emitSignal('scannability-fail', {
      engine,
      styleId: config.style || 'default',
      errorType: 'WORKER_ERROR',
    });
    this.bus.emitSignal('scannability-fallback-active', { active: true });
  }

  private initWorker(config: QRConfig, engine = 'browser'): Worker | null {
    if (this.workerUnsupported) return null;
    if (this.worker) return this.worker;
    if (typeof window === 'undefined') return null;

    try {
      const worker = new Worker(new URL('../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
      this.worker = worker;

      worker.addEventListener('error', (err) => this.handleError(err, config, engine));
      worker.addEventListener('message', (e: MessageEvent) => this.handleWorkerMessage(e, config, engine));

      return worker;
    } catch (err) {
      console.error('[ScannabilityService] Failed to initialize Worker:', err);
      this.workerUnsupported = true;
      this.worker = null;
      this.workerRecoveryActive = true;
      if (this.status === 'checking') {
        this.status = 'fail';
        this.bus.emitSignal('scannability-fail', {
          engine,
          styleId: config.style || 'default',
          errorType: 'WORKER_ERROR',
        });
      }
      return null;
    }
  }

  private handleWorkerMessage(e: MessageEvent, config: QRConfig, engine: string) {
    this.clearWatchdog();
    try {
      if (!isWorkerResponse(e.data)) {
        assertWorkerResponse(e.data);
      } else {
        assertWorkerResponse(e.data);
      }

      const { success, physicalReady, error, configId, localContrastViolations, minLocalContrast } = e.data;

      // Discard stale responses
      if (configId !== String(this.sequenceId)) {
        return;
      }

      if (this.startTime !== null) {
        this.lastLatency = performance.now() - this.startTime;
        this.startTime = null;
      }
      this.isWorkerBusy = false;

      if (localContrastViolations !== undefined) {
        this.localMetrics = { violations: localContrastViolations, minContrast: minLocalContrast };
      }

      this.status = success ? (physicalReady ? 'physical-pass' : 'digital-pass') : 'fail';
      this.workerRecoveryActive = false;

      this.bus.emitSignal('scannability-check-complete', {
        status: this.status,
        success,
        physicalReady,
      });

      if (!success && error) {
        this.bus.emitSignal('scannability-fail', {
          engine,
          styleId: config.style || 'default',
          errorType: error,
        });
      }
    } catch (err) {
      console.error('[ScannabilityService] Worker response validation failed:', err);
      this.status = 'fail';
      this.isWorkerBusy = false;
      this.startTime = null;
      this.bus.emitSignal('scannability-fail', {
        engine,
        styleId: config.style || 'default',
        errorType: 'VALIDATION_ERROR',
      });
    }
  }

  /**
   * Triggers an optical scannability check with latency backpressure controls and main-thread fallback.
   */
  public checkScannability(options: CheckScannabilityOptions): void {
    const { config, engine = 'browser', canvas, overrideImageData, overrideImageBitmap, overrideModuleCount } = options;
    const worker = this.initWorker(config, engine);

    // Active latency backpressure control: drop frames if worker busy and latency > 16ms
    if (worker && this.isWorkerBusy && this.lastLatency > 16.6) {
      if (overrideImageBitmap) {
        releaseImageHandle(overrideImageBitmap);
      }
      return;
    }

    this.status = 'checking';
    this.sequenceId += 1;
    const currentSeqStr = String(this.sequenceId);

    this.bus.emitSignal('scannability-check-start', { sequenceId: currentSeqStr });

    if (!worker) {
      this.runMainThreadFallback(options, currentSeqStr);
      return;
    }

    this.isWorkerBusy = true;
    this.startTime = performance.now();

    // Set 1500ms Watchdog Timeout to catch worker hangs/timeouts and trigger main-thread recovery
    this.clearWatchdog();
    this.watchdogTimeoutTimer = setTimeout(() => {
      if (this.isWorkerBusy && currentSeqStr === String(this.sequenceId)) {
        console.warn(`[ScannabilityService] Worker check timed out (>1500ms). Triggering main-thread fallback.`);
        this.handleError(new Error('WORKER_TIMEOUT'), config, engine);
        this.runMainThreadFallback(options, currentSeqStr);
      }
    }, 1500);

    if (overrideImageBitmap) {
      if (currentSeqStr !== String(this.sequenceId)) {
        releaseImageHandle(overrideImageBitmap);
        this.isWorkerBusy = false;
        this.startTime = null;
        this.clearWatchdog();
        return;
      }
      const payload = {
        imageBitmap: overrideImageBitmap,
        width: overrideImageBitmap.width,
        height: overrideImageBitmap.height,
        isTest: !!navigator.webdriver,
        configId: currentSeqStr,
        moduleCount: overrideModuleCount,
      };
      try {
        assertWorkerRequest(payload);
        worker.postMessage(payload, [payload.imageBitmap]);
      } catch (err) {
        console.error('[ScannabilityService] Outgoing worker payload validation failed:', err);
        this.clearWatchdog();
        this.status = 'fail';
        this.isWorkerBusy = false;
        this.startTime = null;
        releaseImageHandle(overrideImageBitmap);
      }
      return;
    }

    if (overrideImageData) {
      const payload = {
        imageData: overrideImageData,
        width: overrideImageData.width,
        height: overrideImageData.height,
        isTest: !!navigator.webdriver,
        configId: currentSeqStr,
        moduleCount: overrideModuleCount,
      };
      try {
        assertWorkerRequest(payload);
        worker.postMessage(payload, []);
      } catch (err) {
        console.error('[ScannabilityService] Outgoing worker payload validation failed:', err);
        this.clearWatchdog();
        this.status = 'fail';
        this.isWorkerBusy = false;
        this.startTime = null;
      }
      return;
    }

    // Capture main canvas state
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      this.clearWatchdog();
      this.status = 'idle';
      this.isWorkerBusy = false;
      this.startTime = null;
      return;
    }

    if (typeof globalThis.createImageBitmap === 'function') {
      createImageBitmap(canvas)
        .then((imageBitmap) => {
          if (currentSeqStr !== String(this.sequenceId)) {
            imageBitmap.close();
            this.isWorkerBusy = false;
            this.startTime = null;
            this.clearWatchdog();
            return;
          }
          const payload = {
            imageBitmap,
            width: canvas.width,
            height: canvas.height,
            isTest: !!navigator.webdriver,
            configId: currentSeqStr,
            moduleCount: overrideModuleCount,
          };
          try {
            assertWorkerRequest(payload);
            worker.postMessage(payload, [payload.imageBitmap]);
          } catch (err) {
            console.error('[ScannabilityService] Worker message error:', err);
            this.clearWatchdog();
            this.status = 'fail';
            this.isWorkerBusy = false;
            this.startTime = null;
            imageBitmap.close();
          }
        })
        .catch((err) => {
          console.error('[ScannabilityService] createImageBitmap failed, falling back to main-thread:', err);
          this.runMainThreadFallback(options, currentSeqStr);
        });
    } else {
      this.runMainThreadFallback(options, currentSeqStr);
    }
  }

  /**
   * Executes optical scannability validation on main thread when worker fails or times out.
   */
  public async runMainThreadFallback(options: CheckScannabilityOptions, currentSeqStr: string): Promise<void> {
    const { config, engine = 'browser', canvas, overrideImageData, overrideImageBitmap, overrideModuleCount } = options;

    if (overrideImageBitmap) {
      try {
        if (currentSeqStr === String(this.sequenceId)) {
          const { performScannabilityCheck } = await import('../utils/scannabilityChecker');
          let imageData: ImageData | null = null;
          if (typeof OffscreenCanvas !== 'undefined') {
            const off = new OffscreenCanvas(overrideImageBitmap.width || 1, overrideImageBitmap.height || 1);
            const ctx = off.getContext('2d');
            if (ctx) {
              ctx.drawImage(overrideImageBitmap, 0, 0);
              imageData = ctx.getImageData(0, 0, off.width, off.height);
            }
          } else if (typeof document !== 'undefined') {
            const el = document.createElement('canvas');
            el.width = overrideImageBitmap.width || 1;
            el.height = overrideImageBitmap.height || 1;
            const ctx = el.getContext('2d');
            if (ctx) {
              ctx.drawImage(overrideImageBitmap, 0, 0);
              imageData = ctx.getImageData(0, 0, el.width, el.height);
            }
          }
          if (imageData && currentSeqStr === String(this.sequenceId)) {
            const isTest = !!navigator.webdriver;
            const result = performScannabilityCheck(imageData, imageData.width, imageData.height, isTest);
            if (currentSeqStr === String(this.sequenceId)) {
              this.status = result.success ? (result.physicalReady ? 'physical-pass' : 'digital-pass') : 'fail';
              if (!result.success && result.error) {
                this.bus.emitSignal('scannability-fail', {
                  engine,
                  styleId: config.style || 'default',
                  errorType: result.error,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('[ScannabilityService] Main-thread fallback processing failed:', err);
        if (currentSeqStr === String(this.sequenceId)) {
          this.status = 'fail';
          this.bus.emitSignal('scannability-fail', {
            engine,
            styleId: config.style || 'default',
            errorType: 'VALIDATION_ERROR',
          });
        }
      } finally {
        releaseImageHandle(overrideImageBitmap);
      }
      return;
    }

    const { performScannabilityCheck } = await import('../utils/scannabilityChecker');
    const executeCheck = (imgData: ImageData) => {
      try {
        const isTest = !!navigator.webdriver;
        const result = performScannabilityCheck(imgData, imgData.width, imgData.height, isTest, overrideModuleCount);
        if (currentSeqStr !== String(this.sequenceId)) return;
        if (result.localContrastViolations !== undefined) {
          this.localMetrics = { violations: result.localContrastViolations, minContrast: result.minLocalContrast };
        }
        this.status = result.success ? (result.physicalReady ? 'physical-pass' : 'digital-pass') : 'fail';
        if (!result.success && result.error) {
          this.bus.emitSignal('scannability-fail', {
            engine,
            styleId: config.style || 'default',
            errorType: result.error,
          });
        }
      } catch (err) {
        console.error('[ScannabilityService] Main-thread fallback processing failed:', err);
        if (currentSeqStr !== String(this.sequenceId)) return;
        this.status = 'fail';
        this.bus.emitSignal('scannability-fail', {
          engine,
          styleId: config.style || 'default',
          errorType: 'VALIDATION_ERROR',
        });
      }
    };

    if (overrideImageData) {
      executeCheck(overrideImageData);
      return;
    }

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      this.status = 'idle';
      return;
    }

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.status = 'fail';
        return;
      }
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      executeCheck(imageData);
    } catch (err) {
      console.error('[ScannabilityService] Failed to read canvas data for fallback validation:', err);
      this.status = 'fail';
    }
  }

  public terminate(): void {
    this.clearWatchdog();
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.isWorkerBusy = false;
    this.startTime = null;
  }
}

export const scannabilityService = new ScannabilityService();
