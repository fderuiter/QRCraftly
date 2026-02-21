import React from 'react';
import {
  QRType,
  WifiEncryption,
  CryptoNetwork,
  WifiData,
  EmailData,
  VCardData,
  PhoneData,
  SmsData,
  PaymentData
} from '../../types';
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
 * Mapping of QR Types to their corresponding data interfaces.
 * Excludes URL and TEXT which are handled as simple string values.
 */
export interface QRDataMap {
  [QRType.WIFI]: WifiData;
  [QRType.EMAIL]: EmailData;
  [QRType.VCARD]: VCardData;
  [QRType.PHONE]: PhoneData;
  [QRType.SMS]: SmsData;
  [QRType.PAYMENT]: PaymentData;
}

/**
 * Type representing the keys of QRDataMap (i.e., complex QR types).
 */
export type ComplexQRType = keyof QRDataMap;

/**
 * Type guard to check if a QRType is a complex type.
 */
export function isComplexQRType(type: string): type is ComplexQRType {
  return type in INPUT_REGISTRY;
}

export interface InputRegistryEntry<T> {
  Component: React.ComponentType<{ data: T; onChange: (updates: Partial<T>) => void }>;
  initialState: T;
  constructFn: (data: T) => string;
}

/**
 * Registry mapping complex QR types to their components, initial states, and construction functions.
 * Strictly typed to ensure type safety across the application.
 */
export const INPUT_REGISTRY: { [K in ComplexQRType]: InputRegistryEntry<QRDataMap[K]> } = {
  [QRType.WIFI]: {
    Component: WifiInput,
    initialState: {
      ssid: '',
      password: '',
      encryption: WifiEncryption.WPA,
      hidden: false,
      eapIdentity: ''
    },
    constructFn: constructWifiString,
  },
  [QRType.EMAIL]: {
    Component: EmailInput,
    initialState: {
      email: '',
      subject: '',
      body: ''
    },
    constructFn: constructEmailString,
  },
  [QRType.VCARD]: {
    Component: VCardInput,
    initialState: {
      firstName: '',
      lastName: '',
      organization: '',
      title: '',
      phone: '',
      email: '',
      website: '',
      street: '',
      city: '',
      country: ''
    },
    constructFn: constructVCardString,
  },
  [QRType.PHONE]: {
    Component: PhoneInput,
    initialState: {
      number: ''
    },
    constructFn: constructPhoneString,
  },
  [QRType.SMS]: {
    Component: SmsInput,
    initialState: {
      number: '',
      message: ''
    },
    constructFn: constructSmsString,
  },
  [QRType.PAYMENT]: {
    Component: PaymentInput,
    initialState: {
      network: CryptoNetwork.BITCOIN,
      address: '',
      amount: '',
      label: ''
    },
    constructFn: constructPaymentString,
  },
};
