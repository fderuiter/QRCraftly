
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
  style: QRStyle.SQUARES,
  logoUrl: null,
  logoSize: 0.2,
  logoPaddingStyle: 'square' as const,
  logoPadding: 1,
  logoBackgroundColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: 'H' as const
};

/**
 * List of available QR code pattern styles with display labels.
 * Used for the style selection UI.
 */
export const PATTERNS = [
  { id: QRStyle.SQUARES, label: 'Classic Squares' },
  { id: QRStyle.DOTS, label: 'Modern Dots' },
  { id: QRStyle.ROUNDED, label: 'Soft Rounded' },
  { id: QRStyle.DIAMOND, label: 'Luxury Diamond' },
  { id: QRStyle.CROSS, label: 'Swiss Cross' },
  { id: QRStyle.STAR, label: 'Star Dust' },
  { id: QRStyle.HEART, label: 'Love Heart' },
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
