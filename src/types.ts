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
 * Defines the encryption type for WiFi networks.
 */
export enum WifiEncryption {
  WPA = 'WPA',
  WEP = 'WEP',
  NOPASS = 'nopass',
  WPA2_EAP = 'WPA2-EAP',
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
 * Data structure for WiFi network configuration.
 */
export interface WifiData {
  /** The SSID (network name) of the WiFi network. */
  ssid: string;
  /** The password for the WiFi network. */
  password: string;
  /** The encryption type used by the network. */
  encryption: WifiEncryption;
  /** Whether the network SSID is hidden. */
  hidden: boolean;
  /** The identity for WPA2-EAP enterprise networks (optional). */
  eapIdentity?: string;
}

/**
 * Data structure for an Email message.
 */
export interface EmailData {
  /** The recipient's email address. */
  email: string;
  /** The subject line of the email. */
  subject: string;
  /** The body content of the email. */
  body: string;
}

/**
 * Data structure for a vCard (electronic business card).
 */
export interface VCardData {
  /** The first name of the contact. */
  firstName: string;
  /** The last name of the contact. */
  lastName: string;
  /** The organization or company name. */
  organization: string;
  /** The job title of the contact. */
  title: string;
  /** The phone number of the contact. */
  phone: string;
  /** The email address of the contact. */
  email: string;
  /** The website URL of the contact. */
  website: string;
  /** The street address of the contact. */
  street: string;
  /** The city of the contact. */
  city: string;
  /** The country of the contact. */
  country: string;
}

/**
 * Data structure for a phone number.
 */
export interface PhoneData {
  /** The phone number to dial. */
  number: string;
}

/**
 * Data structure for an SMS message.
 */
export interface SmsData {
  /** The recipient's phone number. */
  number: string;
  /** The text message body. */
  message: string;
}

/**
 * Supported cryptocurrency networks for payment.
 */
export enum CryptoNetwork {
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
  LITECOIN = 'litecoin',
  CUSTOM = 'custom',
}

/**
 * Data structure for Payment information (Crypto).
 */
export interface PaymentData {
  /** The cryptocurrency network (e.g. bitcoin, ethereum). */
  network: CryptoNetwork;
  /** The wallet address. */
  address: string;
  /** The amount to request (optional). */
  amount: string;
  /** Label or message for the transaction (optional). */
  label: string;
}

/**
 * Data structure for URL information.
 */
export interface UrlData {
  /** The URL to encode. */
  url: string;
}

/**
 * Data structure for Text information.
 */
export interface TextData {
  /** The text content to encode. */
  text: string;
}

/**
 * Interface representing the modules of a QR code.
 */
export interface QRModules {
  size: number;
  get(row: number, col: number): boolean;
}
