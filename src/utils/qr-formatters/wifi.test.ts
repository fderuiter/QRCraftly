import { describe, it, expect } from 'vitest';
import { constructWifiString, escapeWifiString, WifiData, WifiEncryption } from './wifi';

describe('Wifi Formatter', () => {
  describe('constructWifiString', () => {
    it('constructs a standard WPA WiFi string', () => {
      const data: WifiData = {
        ssid: 'MyNetwork',
        password: 'password123',
        encryption: WifiEncryption.WPA,
        hidden: false
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:MyNetwork;P:password123;H:false;;');
    });

    it('constructs a WPA2-EAP WiFi string', () => {
      const data: WifiData = {
        ssid: 'EnterpriseNet',
        password: 'securepass',
        encryption: WifiEncryption.WPA2_EAP,
        hidden: false,
        eapIdentity: 'user@domain.com'
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA2-EAP;S:EnterpriseNet;I:user@domain.com;P:securepass;H:false;;');
    });

    it('constructs a nopass WiFi string (omits password)', () => {
      const data: WifiData = {
        ssid: 'OpenNet',
        password: 'ignored',
        encryption: WifiEncryption.NOPASS,
        hidden: false
      };
      expect(constructWifiString(data)).toBe('WIFI:T:nopass;S:OpenNet;H:false;;');
    });

    it('escapes special characters in SSID and password', () => {
      const data: WifiData = {
        ssid: 'Net;Work',
        password: 'pass:word\\',
        encryption: WifiEncryption.WPA,
        hidden: false
      };
      // Expect: Net\;Work and pass\:word\\
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:Net\\;Work;P:pass\\:word\\\\;H:false;;');
    });

    it('handles hidden network flag', () => {
      const data: WifiData = {
        ssid: 'HiddenNet',
        password: 'pass',
        encryption: WifiEncryption.WPA,
        hidden: true
      };
      expect(constructWifiString(data)).toContain('H:true');
    });
  });

  describe('escapeWifiString', () => {
    it('returns empty string for undefined', () => {
      expect(escapeWifiString(undefined)).toBe('');
    });
  });
});
