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
  EVENT = 'EVENT',
  EMAIL = 'EMAIL',
  VCARD = 'VCARD',
  PHONE = 'PHONE',
  SMS = 'SMS',
  PAYMENT = 'PAYMENT',
  LOCATION = 'LOCATION',
  MEETING = 'MEETING',
  SOCIAL = 'SOCIAL',
}

/**
 * The standard contract for QR payload generators and hydrators.
 */
export interface QRGeneratorContract<TData> {
  /** The specific QR type this contract handles. */
  type: QRType;
  /** Constructs a string representation from the given data. */
  construct(data: TData): string;
  /** Parses a string to extract the payload data. */
  hydrate(raw: string): TData;
  /** Checks if the raw string matches this QR type. */
  matches(raw: string): boolean;
  /** Validates the constructed value, returning an array of violation strings. */
  validate?(raw: string): string[];
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
 * Defines the error correction level for the QR code.
 */
export enum QRErrorCorrectionLevel {
  L = 'L',
  M = 'M',
  Q = 'Q',
  H = 'H',
}

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
  /** The error correction level. */
  errorCorrectionLevel: QRErrorCorrectionLevel;
  /** Whether to draw a border around the QR code. */
  isBorderEnabled: boolean;
  /** The size of the border relative to the QR code size (0.0 to 0.1). */
  borderSize: number;
  /** The color of the border. */
  borderColor: string;
  /** The visual style of the border. */
  borderStyle: BorderStyle;
  /** Text to display on the border. */
  borderText: string;
  /** Position of the border text. */
  borderTextPosition: BorderTextPosition;
  /** Color of the border text. */
  borderTextColor: string;
  /** Secondary logo to display on the border. */
  borderLogoUrl: string | null;
  /** Position of the border logo. */
  borderLogoPosition: BorderLogoPosition;
  /** The social media export aspect ratio format. */
  socialFormat: SocialFormat;
  /** The visual template style wrapping the QR code in the export. */
  templateStyle: TemplateStyle;
  /** Optional headline text rendered above the QR code in a template. */
  templateHeadline?: string;
  /** Optional subtext rendered below the QR code in a template. */
  templateSubtext?: string;
  /** Optional background color for the template canvas (overrides bgColor when set). */
  templateBgColor?: string;
  /** Optional text/accent color used in template backgrounds and text (overrides fgColor when set). */
  templateTextColor?: string;
  /**
   * Scale multiplier for the QR code bounding box within the template canvas.
   * 1.0 = default size (50 % of canvas width for non-NONE templates).
   * Valid range: 0.5 – 1.5.
   */
  templateQrScale?: number;
  /** Complete sequence of string values representing animated QR frames. */
  animationValues?: string[];
  /** Flag specifying if the visual animation loop is currently active. */
  isAnimating?: boolean;
  /** Desired playback speed of the animation loop in frames per second (FPS). Defaults to 30. */
  animationFps?: number;
  /** Whether adaptive geometric compensation is enabled for custom aesthetic patterns like Starburst and Swiss Dot. */
  isCompensationEnabled?: boolean;
}

/**
 * Defines the style of the border around the QR code.
 */
export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

/**
 * Defines the position of the text on the border.
 */
export type BorderTextPosition = 'top-center' | 'bottom-center';

/**
 * Defines the position of the logo on the border.
 */
export type BorderLogoPosition = 'bottom-center' | 'bottom-right';

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
  /** The postal or zip code of the contact. */
  zip: string;
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
 * Data structure for calendar event information.
 */
export interface EventData {
  /** The event title. */
  title: string;
  /** The event start date and time (ISO string from datetime-local input). */
  startDate: string;
  /** The event end date and time (ISO string from datetime-local input). */
  endDate: string;
  /** The event location. */
  location: string;
  /** The event description. */
  description: string;
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
 * Data structure for plain text information.
 */
export interface TextData {
  /** The text content to encode. */
  text: string;
}

/**
 * Interface representing the modules of a QR code.
 */
export interface QRModules {
  /** The size of the QR code in modules. */
  size: number;
  /** Gets the module value at the specified row and column. */
  get(row: number, col: number): boolean;
}

/**
 * Data structure for Geo-Location information.
 */
export interface LocationData {
  /** The latitude coordinate (decimal degrees, -90 to 90). */
  latitude: string;
  /** The longitude coordinate (decimal degrees, -180 to 180). */
  longitude: string;
}

/**
 * Supported social media platforms for deep links.
 */
export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  TIKTOK = 'tiktok',
}

/**
 * Data structure for Social Media deep links.
 */
export interface SocialData {
  /** The social media platform. */
  platform: SocialPlatform;
  /** The username or handle on the platform. */
  handle: string;
}

/**
 * Data structure for Virtual Meeting links (Zoom, Teams, Google Meet).
 */
export interface MeetingData {
  /** The full meeting invite URL. */
  url: string;
}

/**
 * Defines the social media export aspect ratio / format.
 */
export enum SocialFormat {
  SQUARE_1_1 = '1:1',
  PORTRAIT_4_5 = '4:5',
  STORY_9_16 = '9:16',
}

/**
 * Defines the visual template style applied to the social export canvas.
 */
export enum TemplateStyle {
  NONE = 'none',
  MINIMALIST = 'minimalist',
  GRADIENT_BLUR = 'gradient_blur',
  SOLID_FRAME = 'solid_frame',
}

/**
 * Unified Telemetry Schema
 * Defines the allowed non-sensitive diagnostic telemetry properties.
 * Centralizing this schema prevents naming mismatches and ensures compliance.
 */
export const ALLOWED_TELEMETRY_KEYS = [
  'engine',
  'styleId',
  'errorType',
  'fgColor',
  'bgColor',
  'eyeColor',
  'errorCorrectionLevel',
  'isBorderEnabled',
  'borderSize',
  'borderColor',
  'borderStyle',
  'templateStyle',
 ] as const;

/**
 * Representing an individual telemetry key allowed under compliance guidelines.
 */
type TelemetryKey = typeof ALLOWED_TELEMETRY_KEYS[number];

/**
 * Type definition for the telemetry payload, mapping telemetry keys to safe values.
 */
export type TelemetryPayload = {
  [K in TelemetryKey]?: string | number | boolean | null;
};


