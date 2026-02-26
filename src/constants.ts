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


import { QRStyle, QRType } from './types';

/**
 * The default configuration settings for the QR code generator.
 * Used to initialize the application state.
 */
export const DEFAULT_CONFIG = {
  value: 'https://qrcraftly.com',
  type: QRType.URL,
  fgColor: '#000000',
  bgColor: '#ffffff',
  style: QRStyle.STANDARD,
  logoUrl: null,
  logoSize: 0.2,
  logoPaddingStyle: 'square' as const,
  logoPadding: 1,
  logoBackgroundColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: 'H' as const,
  isBorderEnabled: false,
  borderSize: 0.05,
  borderColor: '#000000',
  borderStyle: 'solid' as const,
  borderText: '',
  borderTextPosition: 'bottom-center' as const,
  borderTextColor: '#ffffff',
  borderLogoUrl: null,
  borderLogoPosition: 'bottom-center' as const,
};

/**
 * List of available QR code pattern styles with display labels.
 * Used for the style selection UI.
 */
export const PATTERNS = [
  { id: QRStyle.STANDARD, label: 'Standard Industrial', description: 'Classic square modules. Reliable and universally scannable.' },
  { id: QRStyle.MODERN, label: 'Modern Soft', description: 'Rounded corners for a friendlier, contemporary look.' },
  { id: QRStyle.SWISS, label: 'Swiss Dot', description: 'Minimalist circular dots. Clean and elegant.' },
  { id: QRStyle.FLUID, label: 'Fluid Ink', description: 'Organic, flowing shapes that mimic ink on paper.' },
  { id: QRStyle.CIRCUIT, label: 'Cyber Circuit', description: 'Tech-inspired connections. Perfect for digital brands.' },
  { id: QRStyle.HIVE, label: 'The Hive', description: 'Hexagonal pattern inspired by nature and structure.' },
  { id: QRStyle.GRUNGE, label: 'Grunge', description: 'Rough, textured edges for an artistic, urban feel.' },
  { id: QRStyle.STARBURST, label: 'Starburst', description: 'Radiating patterns that draw the eye to the center.' },
];

/**
 * List of preset color themes.
 * Each preset defines background, foreground, and eye colors.
 */
export const PRESET_COLORS = [
  { bg: '#ffffff', fg: '#000000', eye: '#000000', label: 'Classic' },
  { bg: '#f8fafc', fg: '#334155', eye: '#0f172a', label: 'Slate' },
  { bg: '#ffffff', fg: '#0f766e', eye: '#115e59', label: 'Teal Brand' },
  { bg: '#eff6ff', fg: '#1e40af', eye: '#172554', label: 'Royal Blue' },
  { bg: '#020617', fg: '#f8fafc', eye: '#38bdf8', label: 'Midnight' },
  { bg: '#f0fdf4', fg: '#166534', eye: '#14532d', label: 'Forest' },
  { bg: '#fff1f2', fg: '#9f1239', eye: '#881337', label: 'Rose' },
  { bg: '#faf5ff', fg: '#6b21a8', eye: '#581c87', label: 'Purple' },
  { bg: '#27272a', fg: '#e4e4e7', eye: '#facc15', label: 'Cyber' },
];
