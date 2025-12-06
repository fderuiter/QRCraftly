
/**
 * Defines the visual style of the QR code data modules.
 */
export enum QRStyle {
  SQUARES = 'squares',
  DOTS = 'dots',
  ROUNDED = 'rounded',
  DIAMOND = 'diamond',
  CROSS = 'cross',
  STAR = 'star',
  HEART = 'heart',
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
  encryption: 'WPA' | 'WEP' | 'nopass' | 'WPA2-EAP';
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
