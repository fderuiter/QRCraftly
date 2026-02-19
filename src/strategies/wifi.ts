import { WifiData, WifiEncryption } from '../types';
import { WifiInput } from '../components/inputs/WifiInput';
import { REGEX_STRICT_CONTROL_CHARS } from '../utils/security';

/**
 * Escapes special characters for WiFi QR code string.
 * Characters to escape: \ ; , " :
 */
export const escapeWifiString = (str: string | undefined): string => {
  if (!str) return '';
  // Strip control characters including newlines (0x00-0x1F, 0x7F-0x9F)
  // because WiFi SSIDs and passwords generally shouldn't have them,
  // and they can break the MECARD/WIFI format or cause parsing issues.
  const cleaned = str.replace(REGEX_STRICT_CONTROL_CHARS, '');
  return cleaned.replace(/([\\;,":])/g, '\\$1');
};

/**
 * Constructs the WiFi QR code string from the given data.
 */
export const constructWifiString = (data: WifiData): string => {
  // Validate encryption type to prevent injection
  const encryption = Object.values(WifiEncryption).includes(data.encryption)
    ? data.encryption
    : WifiEncryption.WPA;

  const parts = [
    `T:${encryption}`,
    `S:${escapeWifiString(data.ssid)}`,
  ];

  if (encryption === WifiEncryption.WPA2_EAP) {
    parts.push(`I:${escapeWifiString(data.eapIdentity)}`);
  }

  if (encryption !== WifiEncryption.NOPASS) {
    parts.push(`P:${escapeWifiString(data.password)}`);
  }

  // Explicitly cast hidden to boolean to prevent string injection
  parts.push(`H:${!!data.hidden}`);

  return `WIFI:${parts.join(';')};;`;
};

export const WifiStrategy = {
  initialState: { ssid: '', password: '', encryption: WifiEncryption.WPA, hidden: false, eapIdentity: '' } as WifiData,
  constructString: constructWifiString,
  InputComponent: WifiInput,
};
