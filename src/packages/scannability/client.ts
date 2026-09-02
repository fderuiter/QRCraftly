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

import { QRConfig } from '@/types';
import { useScannabilityRunner, UseScannabilityReturn } from './lib/workerRunner';

export type { UseScannabilityReturn } from './lib/workerRunner';
export type { ScannabilityStatus, ExportRisk, ExportRiskPolicyInput } from './lib/exportRiskPolicy';
export type { HealthScore } from './lib/scoring';

/**
 * React hook connecting preview canvas surfaces to off-thread scannability evaluation,
 * managing watchdog fault-tolerance and health diagnostics.
 *
 * @param canvasRef - Ref to the preview canvas element.
 * @param config - Current QR code configuration profile.
 * @returns Scannability Health state, trigger callback, and recovery indicators.
 */
export function useScannability(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: QRConfig
): UseScannabilityReturn {
  return useScannabilityRunner(canvasRef, config);
}

