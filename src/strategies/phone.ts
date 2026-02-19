import { PhoneData } from '../types';
import { PhoneInput } from '../components/inputs/PhoneInput';
import { cleanPhoneNumber } from '../utils/security';

/**
 * Constructs the tel string for Phone QR code.
 */
export const constructPhoneString = (data: PhoneData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  return `tel:${cleanNumber}`;
};

export const PhoneStrategy = {
  initialState: { number: '' } as PhoneData,
  constructString: constructPhoneString,
  InputComponent: PhoneInput,
};
