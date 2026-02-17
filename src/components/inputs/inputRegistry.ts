import { QRType } from '../../types';
import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';
import { WifiInput } from './WifiInput';
import { EmailInput } from './EmailInput';
import { VCardInput } from './VCardInput';
import { PhoneInput } from './PhoneInput';
import { SmsInput } from './SmsInput';
import { PaymentInput } from './PaymentInput';

export const INPUT_COMPONENTS = {
  [QRType.URL]: UrlInput,
  [QRType.TEXT]: TextInput,
  [QRType.WIFI]: WifiInput,
  [QRType.EMAIL]: EmailInput,
  [QRType.VCARD]: VCardInput,
  [QRType.PHONE]: PhoneInput,
  [QRType.SMS]: SmsInput,
  [QRType.PAYMENT]: PaymentInput,
};
