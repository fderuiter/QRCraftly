import { cleanPhoneNumber } from '../security';

/**
 * Data structure for a phone number.
 */
export interface PhoneData {
  /** The phone number to dial. */
  number: string;
}

/**
 * Constructs the tel string for Phone QR code.
 */
export const constructPhoneString = (data: PhoneData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  return `tel:${cleanNumber}`;
};
