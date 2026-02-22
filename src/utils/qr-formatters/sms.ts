import { cleanPhoneNumber } from '../security';

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
 * Constructs the smsto string for SMS QR code.
 */
export const constructSmsString = (data: SmsData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  const encodedBody = encodeURIComponent(data.message);
  return `sms:${cleanNumber}?body=${encodedBody}`;
};
