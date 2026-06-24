import { getPublicDomain } from "../../utils/metadataEngine";
import React from "react";
import {
  QRType,
  WifiEncryption,
  CryptoNetwork,
  SocialPlatform,
  UrlData,
  TextData,
  WifiData,
  EmailData,
  VCardData,
  PhoneData,
  SmsData,
  PaymentData,
  EventData,
  LocationData,
  MeetingData,
  SocialData,
} from "../../types";
import { ValidationEngine } from "../../engine/ValidationEngine";
import {
  constructUrlString,
  hydrateUrlData,
  constructTextString,
  hydrateTextData,
  constructWifiString,
  hydrateWifiData,
  constructEmailString,
  hydrateEmailData,
  constructVCardString,
  hydrateVCardData,
  constructPhoneString,
  hydratePhoneData,
  constructSmsString,
  hydrateSmsData,
  constructPaymentString,
  hydratePaymentData,
  constructEventString,
  hydrateEventData,
  constructLocationString,
  hydrateLocationData,
  constructMeetingString,
  hydrateMeetingData,
  constructSocialString,
  hydrateSocialData,
} from "../../utils/qrHelpers";

import { UrlInput } from "./UrlInput";
import { TextInput } from "./TextInput";
import { WifiInput } from "./WifiInput";
import { EmailInput } from "./EmailInput";
import { VCardInput } from "./VCardInput";
import { PhoneInput } from "./PhoneInput";
import { SmsInput } from "./SmsInput";
import { PaymentInput } from "./PaymentInput";
import { EventInput } from "./EventInput";
import { LocationInput } from "./LocationInput";
import { MeetingInput } from "./MeetingInput";
import { SocialInput } from "./SocialInput";

export type InputDataMap = {
  [QRType.URL]: UrlData;
  [QRType.TEXT]: TextData;
  [QRType.WIFI]: WifiData;
  [QRType.EVENT]: EventData;
  [QRType.EMAIL]: EmailData;
  [QRType.VCARD]: VCardData;
  [QRType.PHONE]: PhoneData;
  [QRType.SMS]: SmsData;
  [QRType.PAYMENT]: PaymentData;
  [QRType.LOCATION]: LocationData;
  [QRType.MEETING]: MeetingData;
  [QRType.SOCIAL]: SocialData;
};

export interface InputRegistryEntry<T> {
  Component: React.ComponentType<{
    data: T;
    onChange: (updates: Partial<T>) => void;
  }>;
  initialState: T;
  constructFn: (data: T) => string;
  hydrateFn: (raw: string) => T;
  canHydrateFn: (raw: string) => boolean;
}

export type Registry = {
  [K in QRType]: InputRegistryEntry<InputDataMap[K]>;
};

export const INPUT_REGISTRY: Registry = {
  [QRType.URL]: {
    Component: UrlInput,
    initialState: {
      url: getPublicDomain(),
    } as UrlData,
    constructFn: constructUrlString,
    hydrateFn: hydrateUrlData,
    canHydrateFn: (raw: string) => ValidationEngine.canHydrate(raw, QRType.URL),
  },
  [QRType.TEXT]: {
    Component: TextInput,
    initialState: {
      text: "",
    } as TextData,
    constructFn: constructTextString,
    hydrateFn: hydrateTextData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.TEXT),
  },
  [QRType.WIFI]: {
    Component: WifiInput,
    initialState: {
      ssid: "",
      password: "",
      encryption: WifiEncryption.WPA,
      hidden: false,
      eapIdentity: "",
    } as WifiData,
    constructFn: constructWifiString,
    hydrateFn: hydrateWifiData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.WIFI),
  },
  [QRType.EVENT]: {
    Component: EventInput,
    initialState: {
      title: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    } as EventData,
    constructFn: constructEventString,
    hydrateFn: hydrateEventData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.EVENT),
  },
  [QRType.EMAIL]: {
    Component: EmailInput,
    initialState: {
      email: "",
      subject: "",
      body: "",
    } as EmailData,
    constructFn: constructEmailString,
    hydrateFn: hydrateEmailData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.EMAIL),
  },
  [QRType.VCARD]: {
    Component: VCardInput,
    initialState: {
      firstName: "",
      lastName: "",
      organization: "",
      title: "",
      phone: "",
      email: "",
      website: "",
      street: "",
      city: "",
      country: "",
    } as VCardData,
    constructFn: constructVCardString,
    hydrateFn: hydrateVCardData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.VCARD),
  },
  [QRType.PHONE]: {
    Component: PhoneInput,
    initialState: {
      number: "",
    } as PhoneData,
    constructFn: constructPhoneString,
    hydrateFn: hydratePhoneData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.PHONE),
  },
  [QRType.SMS]: {
    Component: SmsInput,
    initialState: {
      number: "",
      message: "",
    } as SmsData,
    constructFn: constructSmsString,
    hydrateFn: hydrateSmsData,
    canHydrateFn: (raw: string) => ValidationEngine.canHydrate(raw, QRType.SMS),
  },
  [QRType.PAYMENT]: {
    Component: PaymentInput,
    initialState: {
      network: CryptoNetwork.BITCOIN,
      address: "",
      amount: "",
      label: "",
    } as PaymentData,
    constructFn: constructPaymentString,
    hydrateFn: hydratePaymentData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.PAYMENT),
  },
  [QRType.LOCATION]: {
    Component: LocationInput,
    initialState: {
      latitude: "",
      longitude: "",
    } as LocationData,
    constructFn: constructLocationString,
    hydrateFn: hydrateLocationData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.LOCATION),
  },
  [QRType.MEETING]: {
    Component: MeetingInput,
    initialState: {
      url: "",
    } as MeetingData,
    constructFn: constructMeetingString,
    hydrateFn: hydrateMeetingData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.MEETING),
  },
  [QRType.SOCIAL]: {
    Component: SocialInput,
    initialState: {
      platform: SocialPlatform.INSTAGRAM,
      handle: "",
    } as SocialData,
    constructFn: constructSocialString,
    hydrateFn: hydrateSocialData,
    canHydrateFn: (raw: string) =>
      ValidationEngine.canHydrate(raw, QRType.SOCIAL),
  },
};
