import React from 'react';
import { WifiData, WifiEncryption } from '../../types';
import { TextField, SelectField } from './FormFields';

interface WifiInputProps {
  data: WifiData;
  onChange: (updates: Partial<WifiData>) => void;
}

export const WifiInput: React.FC<WifiInputProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-3">
       <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Network Details</h3>
      <TextField
        id="wifi-ssid"
        label="Network Name (SSID)"
        type="text"
        maxLength={32}
        value={data.ssid}
        onChange={(e) => onChange({ ssid: e.target.value })}
        fieldSize="xs"
      />

      <div className="flex-1">
          <SelectField
            id="wifi-encryption"
            label="Encryption"
            value={data.encryption}
            onChange={(e) => onChange({ encryption: e.target.value as WifiEncryption })}
            fieldSize="xs"
          >
            <option value={WifiEncryption.WPA}>WPA / WPA2 / WPA3 (Standard)</option>
            <option value={WifiEncryption.WEP}>WEP (Legacy)</option>
            <option value={WifiEncryption.WPA2_EAP}>WPA2 Enterprise (EAP)</option>
            <option value={WifiEncryption.NOPASS}>None (Open Network)</option>
          </SelectField>
      </div>

      {data.encryption === WifiEncryption.WPA2_EAP && (
          <TextField
              id="wifi-identity"
              label="Identity / Username"
              type="text"
              maxLength={128}
              value={data.eapIdentity}
              onChange={(e) => onChange({ eapIdentity: e.target.value })}
              fieldSize="xs"
          />
      )}

      {data.encryption !== WifiEncryption.NOPASS && (
          <TextField
                id="wifi-password"
                name="password"
                label="Password"
                autoComplete="off"
                type="password"
                maxLength={63}
                value={data.password}
                onChange={(e) => onChange({ password: e.target.value })}
                fieldSize="xs"
                showPasswordToggle
            />
      )}

      <div className="flex items-center pt-2">
          <label htmlFor="wifi-hidden" className="flex items-center gap-2 cursor-pointer">
            <input
              id="wifi-hidden"
              type="checkbox"
              checked={data.hidden}
              onChange={(e) => onChange({ hidden: e.target.checked })}
              className="rounded text-teal-700 dark:text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400 font-sans">Hidden Network</span>
          </label>
      </div>
    </div>
  );
};
