/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import jsQR from 'jsqr';
import { isDangerousUrl } from '@/utils/security';
import { applyOpticalSimulationMath } from './opticalSimulation';
import { auditModuleContrast } from './contrastAudit';

export interface ScannabilityResult {
  success: boolean;
  physicalReady: boolean;
  error?: string | null;
  localContrastViolations?: number;
  minLocalContrast?: number;
}

/** Raw RGBA pixels with their dimensions (an `ImageData` satisfies it). */
export interface PixelFrame {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Reusable scratch memory for the optical print simulation. The worker keeps one pair alive
 * across requests so continuous slider edits do not allocate two full-frame buffers per check.
 */
export interface OpticalScratchBuffers {
  dst?: Uint8ClampedArray;
  temp?: Uint8ClampedArray;
}

type Decoder = typeof jsQR;

// Some bundlers hand the CommonJS jsQR build back as `{ default: fn }`.
const decodeQR: Decoder =
  typeof jsQR === 'function' ? jsQR : (jsQR as unknown as { default: Decoder }).default;

/**
 * Attempts one jsQR pass. Decoder exceptions are treated as "no code found" so a crash in one
 * polarity pass never prevents the next pass from running.
 */
function tryDecode(
  frame: PixelFrame,
  inversionAttempts: 'dontInvert' | 'attemptBoth'
): string | null {
  try {
    const code = decodeQR(frame.data, frame.width, frame.height, { inversionAttempts });
    return code ? code.data : null;
  } catch {
    return null;
  }
}

/**
 * The single Scannability Health check, written as a generator so the Scannability Worker can
 * yield to its event loop (and abandon superseded requests) between the expensive stages, while
 * the main-thread fallback runs the exact same steps synchronously. Every `yield` marks a point
 * where the caller may stop iterating.
 *
 * Stages: localized module contrast audit, two-pass (normal, then inverted) digital decode, the
 * dangerous-URL security check, optical print simulation, then a two-pass physical decode.
 *
 * @param frame - Pixels to evaluate.
 * @param isTest - Skips the randomized optical simulation (deterministic automation runs).
 * @param moduleCount - QR modules per side; enables the localized contrast audit.
 * @param scratch - Optional reusable buffers for the optical simulation.
 * @returns A generator whose return value is the check result.
 */
export function* scannabilitySteps(
  frame: PixelFrame,
  isTest: boolean,
  moduleCount?: number,
  scratch?: OpticalScratchBuffers
): Generator<void, ScannabilityResult, void> {
  const { width, height } = frame;

  // 0. Localized module contrast audit
  let localContrastViolations = 0;
  let minLocalContrast = 21;
  if (moduleCount && moduleCount > 0) {
    const audit = auditModuleContrast(frame, moduleCount);
    localContrastViolations = audit.violations;
    minLocalContrast = audit.minContrast;
  }
  const metrics = { localContrastViolations, minLocalContrast };

  // 1. Digital check (pass 1: normal polarity, pass 2: inverted polarity)
  let decoded = tryDecode(frame, 'dontInvert');
  if (decoded === null) {
    yield;
    decoded = tryDecode(frame, 'attemptBoth');
  }

  if (decoded === null) {
    return { success: false, physicalReady: false, error: 'NOT_FOUND', ...metrics };
  }

  // Security check: a code that decodes to a dangerous URL is never reported as scannable.
  if (isDangerousUrl(decoded)) {
    return { success: false, physicalReady: false, error: 'SECURITY_VIOLATION', ...metrics };
  }

  yield;

  // 2. Optical print simulation
  let simulated: PixelFrame = frame;
  if (!isTest) {
    const length = width * height * 4;
    if (scratch) {
      if (!scratch.dst || scratch.dst.length !== length) scratch.dst = new Uint8ClampedArray(length);
      if (!scratch.temp || scratch.temp.length !== length) scratch.temp = new Uint8ClampedArray(length);
    }
    const dst = applyOpticalSimulationMath(frame.data, width, height, 10, scratch?.dst, scratch?.temp);
    simulated = { data: dst, width, height };
  }

  yield;

  // 3. Physical check (pass 1: normal polarity, pass 2: inverted polarity)
  let physicalReady = tryDecode(simulated, 'dontInvert') !== null;
  if (!physicalReady) {
    yield;
    physicalReady = tryDecode(simulated, 'attemptBoth') !== null;
  }

  return { success: true, physicalReady, ...metrics };
}

/**
 * Runs the Scannability Health check synchronously on the calling thread. This is the same
 * step sequence the Scannability Worker runs (see `scannabilitySteps`), so worker and
 * main-thread fallback results match by construction rather than by copied code.
 */
export function performScannabilityCheck(
  imageData: PixelFrame,
  width: number,
  height: number,
  isTest: boolean,
  moduleCount?: number
): ScannabilityResult {
  const steps = scannabilitySteps({ data: imageData.data, width, height }, isTest, moduleCount);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
