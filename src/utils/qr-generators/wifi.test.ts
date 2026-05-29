import { describe, it, expect } from 'vitest';
import { constructWifiString, hydrateWifiData, unescapeWifiString, escapeWifiString } from './wifi';
import { WifiEncryption } from '../../types';

describe('Wifi generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      ssid: 'My Network',
      password: 'password123;',
      encryption: WifiEncryption.WPA,
      hidden: true,
      eapIdentity: '',
    };
    const str = constructWifiString(data);
    const hydrated = hydrateWifiData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates unknown fields or non-wifi strings', () => {
    const result = hydrateWifiData('random');
    expect(result.ssid).toBe('');

    const result2 = hydrateWifiData('WIFI:INVALID;;');
    expect(result2.ssid).toBe('');

    const result3 = hydrateWifiData('WIFI:T:UNKNOWN;;');
    expect(result3.encryption).toBe(WifiEncryption.WPA);
  });

  it('edge cases for unescaping', () => {
    expect(unescapeWifiString(undefined)).toBe('');
    expect(escapeWifiString(undefined)).toBe('');
  });
});

it('hydrates WPA2-EAP identity', () => {
  const data = {
    ssid: 'My Enterprise',
    password: 'password123;',
    encryption: WifiEncryption.WPA2_EAP,
    hidden: false,
    eapIdentity: 'user123',
  };
  const str = constructWifiString(data);
  const hydrated = hydrateWifiData(str);
  expect(hydrated).toEqual(data);
});
