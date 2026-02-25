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
  PaymentData,
  UrlData,
  TextData
} from '../../types';
import { constructWifiString } from '../../utils/qr-generators/wifi';
import { constructEmailString } from '../../utils/qr-generators/email';
import { constructVCardString } from '../../utils/qr-generators/vcard';
import { constructPhoneString } from '../../utils/qr-generators/phone';
import { constructSmsString } from '../../utils/qr-generators/sms';
import { constructPaymentString } from '../../utils/qr-generators/payment';

import { WifiInput } from './WifiInput';
import { EmailInput } from './EmailInput';
import { VCardInput } from './VCardInput';
import { PhoneInput } from './PhoneInput';
import { SmsInput } from './SmsInput';
import { PaymentInput } from './PaymentInput';
import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';

export interface InputRegistryEntry<T> {
  Component: React.ComponentType<{ data: T; onChange: (updates: Partial<T>) => void }>;
  initialState: T;
  constructFn: (data: T) => string;
  hydrateFn?: (value: string) => T;
}

export const INPUT_REGISTRY: Record<string, InputRegistryEntry<any>> = {
  [QRType.URL]: {
    Component: UrlInput,
    initialState: {
      url: ''
    } as UrlData,
    constructFn: (data: UrlData) => data.url,
    hydrateFn: (value: string) => ({ url: value }),
  },
  [QRType.TEXT]: {
    Component: TextInput,
    initialState: {
      text: ''
    } as TextData,
    constructFn: (data: TextData) => data.text,
    hydrateFn: (value: string) => ({ text: value }),
  },
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
