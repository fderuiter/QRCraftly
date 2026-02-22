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

/**
 * Defines the visual style of the QR code.
 * Each style dictates the data modules, eye frame, and eyeball appearance.
 */
export enum QRStyle {
  STANDARD = 'standard',
  MODERN = 'modern',
  SWISS = 'swiss',
  FLUID = 'fluid',
  CIRCUIT = 'circuit',
  HIVE = 'hive',
  GRUNGE = 'grunge',
  STARBURST = 'starburst',
}

/**
 * Defines the type of data encoded in the QR code.
 */
export enum QRType {
  URL = 'URL',
  TEXT = 'TEXT',
  WIFI = 'WIFI',
  EMAIL = 'EMAIL',
  VCARD = 'VCARD',
  PHONE = 'PHONE',
  SMS = 'SMS',
  PAYMENT = 'PAYMENT',
}

/**
 * Defines the shape of the padding area around an embedded logo.
 */
export type LogoPaddingStyle = 'square' | 'circle' | 'none';

/**
 * Configuration interface for generating a QR code.
 * Contains all visual and data parameters.
 */
export interface QRConfig {
  /** The raw data string to be encoded (e.g., URL, text). */
  value: string;
  /** The type of content being encoded. */
  type: QRType;
  /** The foreground color of the QR code modules. */
  fgColor: string;
  /** The background color of the QR code. */
  bgColor: string;
  /** The visual style of the QR code modules. */
  style: QRStyle;
  /** The URL of the logo image to be embedded in the center, or null if none. */
  logoUrl: string | null;
  /** The size of the logo relative to the QR code size (usually 0.1 to 0.4). */
  logoSize: number;
  /** The shape of the background padding behind the logo. */
  logoPaddingStyle: LogoPaddingStyle;
  /** The size of the padding around the logo in modules. */
  logoPadding: number;
  /** The background color of the logo padding area. */
  logoBackgroundColor: string;
  /** The color of the position detection patterns (eyes) in the corners. */
  eyeColor: string;
  /** The error correction level (L, M, Q, H). */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  /** Whether to draw a border around the QR code. */
  isBorderEnabled: boolean;
  /** The size of the border relative to the QR code size (0.0 to 0.1). */
  borderSize: number;
  /** The color of the border. */
  borderColor: string;
  /** The visual style of the border. */
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  /** Text to display on the border. */
  borderText: string;
  /** Position of the border text. */
  borderTextPosition: 'top-center' | 'bottom-center';
  /** Color of the border text. */
  borderTextColor: string;
  /** Secondary logo to display on the border. */
  borderLogoUrl: string | null;
  /** Position of the border logo. */
  borderLogoPosition: 'bottom-center' | 'bottom-right';
}

/**
 * Interface representing the modules of a QR code.
 */
export interface QRModules {
  size: number;
  get(row: number, col: number): boolean;
}

// Re-export types from modular formatters
export { WifiEncryption } from './utils/qr-formatters/wifi';
export type { WifiData } from './utils/qr-formatters/wifi';
export type { EmailData } from './utils/qr-formatters/email';
export type { VCardData } from './utils/qr-formatters/vcard';
export type { PhoneData } from './utils/qr-formatters/phone';
export type { SmsData } from './utils/qr-formatters/sms';
export { CryptoNetwork } from './utils/qr-formatters/payment';
export type { PaymentData } from './utils/qr-formatters/payment';
