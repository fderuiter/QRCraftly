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
}

export type Registry = {
  [K in QRType]: InputRegistryEntry<InputDataMap[K]>;
};

export const INPUT_REGISTRY: Registry = {
  [QRType.URL]: {
    Component: UrlInput,
    initialState: {
      url: "https://qrcraftly.com",
    } as UrlData,
    constructFn: constructUrlString,
    hydrateFn: hydrateUrlData,
  },
  [QRType.TEXT]: {
    Component: TextInput,
    initialState: {
      text: "",
    } as TextData,
    constructFn: constructTextString,
    hydrateFn: hydrateTextData,
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
  },
  [QRType.PHONE]: {
    Component: PhoneInput,
    initialState: {
      number: "",
    } as PhoneData,
    constructFn: constructPhoneString,
    hydrateFn: hydratePhoneData,
  },
  [QRType.SMS]: {
    Component: SmsInput,
    initialState: {
      number: "",
      message: "",
    } as SmsData,
    constructFn: constructSmsString,
    hydrateFn: hydrateSmsData,
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
  },
  [QRType.LOCATION]: {
    Component: LocationInput,
    initialState: {
      latitude: "",
      longitude: "",
    } as LocationData,
    constructFn: constructLocationString,
    hydrateFn: hydrateLocationData,
  },
  [QRType.MEETING]: {
    Component: MeetingInput,
    initialState: {
      url: "",
    } as MeetingData,
    constructFn: constructMeetingString,
    hydrateFn: hydrateMeetingData,
  },
  [QRType.SOCIAL]: {
    Component: SocialInput,
    initialState: {
      platform: SocialPlatform.INSTAGRAM,
      handle: "",
    } as SocialData,
    constructFn: constructSocialString,
    hydrateFn: hydrateSocialData,
  },
};
