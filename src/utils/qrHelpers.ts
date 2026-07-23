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

// Re-export specific generators
export * from './qr-generators/wifi';
export * from './qr-generators/email';
export * from './qr-generators/vcard';
export * from './qr-generators/phone';
export * from './qr-generators/sms';
export * from './qr-generators/payment';
export * from './qr-generators/event';
export * from './qr-generators/url';
export * from './qr-generators/text';
export * from './qr-generators/location';
export * from './qr-generators/meeting';
export * from './qr-generators/social';

// Re-export generic URL utility
export * from './url';

import { QRType, QRGeneratorContract } from '../types';
import { WifiContract } from './qr-generators/wifi';
import { EmailContract } from './qr-generators/email';
import { VCardContract } from './qr-generators/vcard';
import { PhoneContract } from './qr-generators/phone';
import { SmsContract } from './qr-generators/sms';
import { PaymentContract } from './qr-generators/payment';
import { EventContract } from './qr-generators/event';
import { UrlContract } from './qr-generators/url';
import { TextContract } from './qr-generators/text';
import { LocationContract } from './qr-generators/location';
import { MeetingContract } from './qr-generators/meeting';
import { SocialContract } from './qr-generators/social';

export const QR_GENERATORS: Record<QRType, QRGeneratorContract<any>> = {
  [QRType.WIFI]: WifiContract,
  [QRType.EMAIL]: EmailContract,
  [QRType.VCARD]: VCardContract,
  [QRType.PHONE]: PhoneContract,
  [QRType.SMS]: SmsContract,
  [QRType.PAYMENT]: PaymentContract,
  [QRType.EVENT]: EventContract,
  [QRType.URL]: UrlContract,
  [QRType.TEXT]: TextContract,
  [QRType.LOCATION]: LocationContract,
  [QRType.MEETING]: MeetingContract,
  [QRType.SOCIAL]: SocialContract,
};
