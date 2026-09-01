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

import { QRConfig, TemplateStyle, SocialFormat } from '../types';
import { ValidationEngine } from '../engine/ValidationEngine';
import { performScannabilityCheck } from '../utils/scannabilityChecker';
import { validateSvgScannability } from '../utils/svgExport';
import { SignalBus, globalSignalBus } from './SignalBus';

export interface ExportSafetyEvaluation {
  allowed: boolean;
  isScannable: boolean;
  score: number;
  warnings: string[];
}

/**
 * Pure background safety service for intercepting file exports (PNG, JPEG, WebP, SVG, Share, Clipboard)
 * and evaluating optical quality scores outside view component lifecycles.
 */
export class ExportSafetyService {
  private bus: SignalBus;

  constructor(bus: SignalBus = globalSignalBus) {
    this.bus = bus;
  }

  /**
   * Performs an optical scannability validation pass on a rendered canvas element.
   * Social templates and decorative poster frames bypass full matrix decode.
   * @param canvas Target HTMLCanvasElement.
   * @param config QR generation configuration.
   */
  public validateCanvasScannability(canvas: HTMLCanvasElement, config: QRConfig): boolean {
    if (config.templateStyle !== TemplateStyle.NONE || config.socialFormat !== SocialFormat.SQUARE_1_1) {
      return true;
    }
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = performScannabilityCheck(imageData, canvas.width, canvas.height, true);
      return result.success;
    } catch (err) {
      console.error('[ExportSafetyService] Canvas scannability check failed:', err);
      return false;
    }
  }

  /**
   * Intercepts an export action, runs optical health score evaluation, and emits signal bus events
   * if optical quality thresholds are not met (<70 score or scannability decode failure).
   * @param config QR configuration.
   * @param options Target canvas, SVG string, or export format options.
   */
  public async evaluateExportSafety(
    config: QRConfig,
    options?: { canvas?: HTMLCanvasElement | null; svgString?: string; format?: string }
  ): Promise<ExportSafetyEvaluation> {
    const health = ValidationEngine.calculateScannability(config);
    let isScannable = true;

    if (options?.canvas) {
      isScannable = this.validateCanvasScannability(options.canvas, config);
    } else if (options?.svgString) {
      isScannable = await validateSvgScannability(options.svgString, config);
    }

    const allowed = isScannable && health.score >= 50;

    const evaluation: ExportSafetyEvaluation = {
      allowed,
      isScannable,
      score: health.score,
      warnings: health.warnings,
    };

    this.bus.emitSignal('export-safety-check', {
      format: options?.format || 'image',
      ...evaluation,
    });

    if (!isScannable || health.score < 70) {
      this.bus.emitSignal('export-quality-low', {
        format: options?.format || 'image',
        ...evaluation,
      });
    }

    return evaluation;
  }
}

export const exportSafetyService = new ExportSafetyService();
