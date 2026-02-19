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

import type { ElementType } from 'react';
import { QRType, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData, WifiEncryption, CryptoNetwork } from '../../types';
import {
  constructWifiString,
  constructEmailString,
  constructVCardString,
  constructPhoneString,
  constructSmsString,
  constructPaymentString
} from '../../utils/qrHelpers';

import { WifiInput } from './WifiInput';
import { EmailInput } from './EmailInput';
import { VCardInput } from './VCardInput';
import { PhoneInput } from './PhoneInput';
import { SmsInput } from './SmsInput';
import { PaymentInput } from './PaymentInput';

/**
 * Interface representing a registry entry for an input type.
 * @template T - The type of the data object for this input.
 */
interface InputRegistryEntry<T> {
  /** The React component to render for this input type. */
  Component: ElementType;
  /** The initial state for the data object. */
  initialState: T;
  /** Function to construct the QR code string from the data object. */
  construct: (data: T) => string;
}

/**
 * Registry mapping QR types to their input configuration.
 * This centralizes the logic for initial state, component selection, and string construction.
 */
export const INPUT_REGISTRY: Partial<Record<QRType, InputRegistryEntry<any>>> = {
  [QRType.WIFI]: {
    Component: WifiInput,
    initialState: { ssid: '', password: '', encryption: WifiEncryption.WPA, hidden: false, eapIdentity: '' } as WifiData,
    construct: constructWifiString,
  },
  [QRType.EMAIL]: {
    Component: EmailInput,
    initialState: { email: '', subject: '', body: '' } as EmailData,
    construct: constructEmailString,
  },
  [QRType.VCARD]: {
    Component: VCardInput,
    initialState: {
      firstName: '', lastName: '', organization: '', title: '',
      phone: '', email: '', website: '', street: '', city: '', country: ''
    } as VCardData,
    construct: constructVCardString,
  },
  [QRType.PHONE]: {
    Component: PhoneInput,
    initialState: { number: '' } as PhoneData,
    construct: constructPhoneString,
  },
  [QRType.SMS]: {
    Component: SmsInput,
    initialState: { number: '', message: '' } as SmsData,
    construct: constructSmsString,
  },
  [QRType.PAYMENT]: {
    Component: PaymentInput,
    initialState: { network: CryptoNetwork.BITCOIN, address: '', amount: '', label: '' } as PaymentData,
    construct: constructPaymentString,
  },
};
