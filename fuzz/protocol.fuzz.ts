import { FuzzedDataProvider } from '@jazzer.js/core';
import { hydrateWifiData, constructWifiString } from '../src/utils/qr-generators/wifi';
import { hydrateVCardData, constructVCardString } from '../src/utils/qr-generators/vcard';
import { hydrateEmailData, constructEmailString } from '../src/utils/qr-generators/email';
import { hydrateEventData, constructEventString } from '../src/utils/qr-generators/event';
import { hydrateLocationData, constructLocationString } from '../src/utils/qr-generators/location';
import { hydrateMeetingData, constructMeetingString } from '../src/utils/qr-generators/meeting';
import { hydratePaymentData, constructPaymentString } from '../src/utils/qr-generators/payment';
import { hydratePhoneData, constructPhoneString } from '../src/utils/qr-generators/phone';
import { hydrateSmsData, constructSmsString } from '../src/utils/qr-generators/sms';
import { hydrateSocialData, constructSocialString } from '../src/utils/qr-generators/social';
import { hydrateTextData, constructTextString } from '../src/utils/qr-generators/text';
import { hydrateUrlData, constructUrlString } from '../src/utils/qr-generators/url';
import { WifiEncryption } from '../src/types';

export function fuzz(data: Buffer) {
  const fdp = new FuzzedDataProvider(data);
  
  // Fuzz string parser -> generator
  const inputString = fdp.consumeString(fdp.consumeIntegralInRange(0, 500));
  
  constructWifiString(hydrateWifiData(inputString));
  constructVCardString(hydrateVCardData(inputString));
  constructEmailString(hydrateEmailData(inputString));
  constructEventString(hydrateEventData(inputString));
  constructLocationString(hydrateLocationData(inputString));
  constructMeetingString(hydrateMeetingData(inputString));
  constructPaymentString(hydratePaymentData(inputString));
  constructPhoneString(hydratePhoneData(inputString));
  constructSmsString(hydrateSmsData(inputString));
  constructSocialString(hydrateSocialData(inputString));
  constructTextString(hydrateTextData(inputString));
  constructUrlString(hydrateUrlData(inputString));

  // Fuzz generator from arbitrary objects (simulating raw user form input)
  const fuzzedWifi = {
    ssid: fdp.consumeString(50),
    password: fdp.consumeString(50),
    encryption: fdp.pickValue(Object.values(WifiEncryption)),
    hidden: fdp.consumeBoolean(),
    eapIdentity: fdp.consumeString(50),
  };
  constructWifiString(fuzzedWifi);

  const fuzzedVCard = {
    firstName: fdp.consumeString(20),
    lastName: fdp.consumeString(20),
    organization: fdp.consumeString(20),
    title: fdp.consumeString(20),
    phone: fdp.consumeString(20),
    email: fdp.consumeString(20),
    website: fdp.consumeString(20),
    street: fdp.consumeString(20),
    city: fdp.consumeString(20),
    country: fdp.consumeString(20),
  };
  constructVCardString(fuzzedVCard);
  
  const fuzzedEmail = {
    email: fdp.consumeString(50),
    subject: fdp.consumeString(50),
    body: fdp.consumeString(100),
  };
  constructEmailString(fuzzedEmail);
}
