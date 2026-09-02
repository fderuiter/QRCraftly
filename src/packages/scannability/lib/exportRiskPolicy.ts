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

export type ScannabilityStatus = 'idle' | 'checking' | 'digital-pass' | 'physical-pass' | 'fail';

export type ExportRisk = 'safe' | 'caution' | 'unsafe';

export interface ExportRiskPolicyInput {
  status: ScannabilityStatus;
  health?: {
    score: number;
    warnings?: string[];
    criticalWarnings?: string[];
  };
}

/**
 * Classifies whether an export can proceed normally, needs guidance, or needs confirmation.
 * @param input - Current Scannability Health evidence.
 * @returns The shared risk classification for every export surface.
 */
export function getExportRiskPolicy({ status, health }: ExportRiskPolicyInput): ExportRisk {
  if (status === 'fail' || health?.criticalWarnings?.length) {
    return 'unsafe';
  }

  if (status === 'physical-pass' && !health) {
    return 'safe';
  }

  if (status === 'idle' || status === 'checking' || !health || health.score < 80) {
    return 'caution';
  }

  return 'safe';
}

