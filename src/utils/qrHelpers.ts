import { WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData } from '../types';

/**
 * Escapes special characters for WiFi QR code string.
 * Characters to escape: \ ; , " :
 */
export const escapeWifiString = (str: string | undefined): string => {
  if (!str) return '';
  return str.replace(/([\\;,":])/g, '\\$1');
};

/**
 * Constructs the WiFi QR code string from the given data.
 */
export const constructWifiString = (data: WifiData): string => {
  const ssid = escapeWifiString(data.ssid);
  const hidden = data.hidden;

  if (data.encryption === 'WPA2-EAP') {
    const identity = escapeWifiString(data.eapIdentity);
    const password = escapeWifiString(data.password);
    return `WIFI:T:WPA2-EAP;S:${ssid};I:${identity};P:${password};H:${hidden};;`;
  } else {
    if (data.encryption === 'nopass') {
      return `WIFI:T:${data.encryption};S:${ssid};H:${hidden};;`;
    } else {
      const password = escapeWifiString(data.password);
      return `WIFI:T:${data.encryption};S:${ssid};P:${password};H:${hidden};;`;
    }
  }
};

/**
 * Constructs the mailto string for Email QR code.
 */
export const constructEmailString = (data: EmailData): string => {
  // Sanitize email to prevent header injection (e.g. ?cc=attacker@example.com)
  const safeEmail = data.email.split('?')[0];
  return `mailto:${safeEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
};

/**
 * Escapes special characters for vCard property values.
 * Characters to escape: \ ; , and newlines.
 */
export const escapeVCardString = (str: string | undefined): string => {
  if (!str) return '';
  // 1. Escape backslashes first to avoid double escaping
  // 2. Escape newlines as \n
  // 3. Escape commas and semicolons
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([;,])/g, '\\$1');
};

/**
 * Constructs the vCard 3.0 string.
 */
export const constructVCardString = (data: VCardData): string => {
  // Escape all fields
  const lastName = escapeVCardString(data.lastName);
  const firstName = escapeVCardString(data.firstName);
  const organization = escapeVCardString(data.organization);
  const title = escapeVCardString(data.title);
  const phone = escapeVCardString(data.phone);
  const email = escapeVCardString(data.email);
  const website = escapeVCardString(data.website);
  const street = escapeVCardString(data.street);
  const city = escapeVCardString(data.city);
  const country = escapeVCardString(data.country);

  // Construct VCard 3.0 string
  return `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${firstName} ${lastName}\nORG:${organization}\nTITLE:${title}\nTEL:${phone}\nEMAIL:${email}\nURL:${website}\nADR:;;${street};${city};;;${country}\nEND:VCARD`;
};

/**
 * Constructs the tel string for Phone QR code.
 */
export const constructPhoneString = (data: PhoneData): string => {
  const cleanNumber = data.number.replace(/[\s:]+/g, '');
  return `tel:${cleanNumber}`;
};

/**
 * Constructs the smsto string for SMS QR code.
 */
export const constructSmsString = (data: SmsData): string => {
  const cleanNumber = data.number.replace(/[\s:]+/g, '');
  return `smsto:${cleanNumber}:${data.message}`;
};

/**
 * Constructs the crypto payment URI string.
 */
export const constructPaymentString = (data: PaymentData): string => {
  let paymentString = '';

  if (data.network === 'custom') {
    paymentString = data.address;
  } else {
    // Sanitize address to prevent parameter injection if user accidentally pastes a full URI or malicious string
    const safeAddress = data.address.split('?')[0];
    paymentString = `${data.network}:${safeAddress}`;
    const params: string[] = [];

    if (data.amount) {
      // Encode amount to prevent parameter injection
      params.push(`amount=${encodeURIComponent(data.amount)}`);
    }

    if (data.label) {
      params.push(`label=${encodeURIComponent(data.label)}`);
    }

    if (params.length > 0) {
      paymentString += `?${params.join('&')}`;
    }
  }
  return paymentString;
};
