import React, { useState } from 'react';
import { WifiData, WifiEncryption } from '../../types';
import { Eye, EyeOff } from 'lucide-react';
import { INPUT_CLASSES, SELECT_CLASSES } from './styles';

interface WifiInputProps {
  data: WifiData;
  onChange: (updates: Partial<WifiData>) => void;
}

export const WifiInput: React.FC<WifiInputProps> = ({ data, onChange }) => {
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  return (
    <div className="space-y-3">
       <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Network Details</h3>
      <div>
        <label htmlFor="wifi-ssid" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Network Name (SSID)</label>
        <input
          id="wifi-ssid"
          type="text"
          maxLength={32}
          value={data.ssid}
          onChange={(e) => onChange({ ssid: e.target.value })}
          className={INPUT_CLASSES}
        />
      </div>

      <div className="flex-1">
          <label htmlFor="wifi-encryption" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Encryption</label>
          <select
            id="wifi-encryption"
            value={data.encryption}
            onChange={(e) => onChange({ encryption: e.target.value as WifiEncryption })}
            className={SELECT_CLASSES}
          >
            <option value={WifiEncryption.WPA}>WPA / WPA2 / WPA3 (Standard)</option>
            <option value={WifiEncryption.WEP}>WEP (Legacy)</option>
            <option value={WifiEncryption.WPA2_EAP}>WPA2 Enterprise (EAP)</option>
            <option value={WifiEncryption.NOPASS}>None (Open Network)</option>
          </select>
      </div>

      {data.encryption === WifiEncryption.WPA2_EAP && (
          <div>
              <label htmlFor="wifi-identity" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Identity / Username</label>
              <input
                  id="wifi-identity"
                  type="text"
                  maxLength={128}
                  value={data.eapIdentity}
                  onChange={(e) => onChange({ eapIdentity: e.target.value })}
                  className={INPUT_CLASSES}
              />
          </div>
      )}

      {data.encryption !== WifiEncryption.NOPASS && (
          <div>
          <label htmlFor="wifi-password" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Password</label>
          <div className="relative">
            <input
                id="wifi-password"
                name="password"
                autoComplete="off"
                type={showWifiPassword ? 'text' : 'password'}
                maxLength={63}
                value={data.password}
                onChange={(e) => onChange({ password: e.target.value })}
                className={`${INPUT_CLASSES} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowWifiPassword(!showWifiPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={showWifiPassword ? "Hide password" : "Show password"}
            >
              {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          </div>
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
