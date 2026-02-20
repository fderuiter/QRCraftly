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

export interface InputRegistryEntry<T> {
  Component: React.ComponentType<{ data: T; onChange: (updates: Partial<T>) => void }>;
  initialState: T;
  constructFn: (data: T) => string;
}

export const INPUT_REGISTRY: Record<string, InputRegistryEntry<any>> = {
  [QRType.WIFI]: {
    Component: WifiInput,
    initialState: {
      ssid: '',
      password: '',
      encryption: WifiEncryption.WPA,
      hidden: false,
      eapIdentity: ''
    } as WifiData,
    constructFn: constructWifiString,
  },
  [QRType.EMAIL]: {
    Component: EmailInput,
    initialState: {
      email: '',
      subject: '',
      body: ''
    } as EmailData,
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
    } as VCardData,
    constructFn: constructVCardString,
  },
  [QRType.PHONE]: {
    Component: PhoneInput,
    initialState: {
      number: ''
    } as PhoneData,
    constructFn: constructPhoneString,
  },
  [QRType.SMS]: {
    Component: SmsInput,
    initialState: {
      number: '',
      message: ''
    } as SmsData,
    constructFn: constructSmsString,
  },
  [QRType.PAYMENT]: {
    Component: PaymentInput,
    initialState: {
      network: CryptoNetwork.BITCOIN,
      address: '',
      amount: '',
      label: ''
    } as PaymentData,
    constructFn: constructPaymentString,
  },
};
