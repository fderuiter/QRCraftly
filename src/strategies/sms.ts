import { SmsData } from '../types';
import { SmsInput } from '../components/inputs/SmsInput';
import { cleanPhoneNumber } from '../utils/security';

/**
 * Constructs the smsto string for SMS QR code.
 */
export const constructSmsString = (data: SmsData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  const encodedBody = encodeURIComponent(data.message);
  return `sms:${cleanNumber}?body=${encodedBody}`;
};

export const SmsStrategy = {
  initialState: { number: '', message: '' } as SmsData,
  constructString: constructSmsString,
  InputComponent: SmsInput,
};
