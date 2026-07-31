import React from "react";
import { WifiData, WifiEncryption } from "../../types";
import { TextField, SelectField, CheckboxField } from "../ui/FormFields";
import { FIELDSET_CLASSES, LEGEND_CLASSES } from "../ui/styles";

/**
 *
 */
interface WifiInputProps {
  /**
   *
   */
  data: WifiData;
  /**
   *
   */
  onChange: (updates: Partial<WifiData>) => void;
}

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.onChange
 */
export const WifiInput: React.FC<WifiInputProps> = ({ data, onChange }) => {
  return (
    <fieldset className={FIELDSET_CLASSES}>
      <legend className={LEGEND_CLASSES}>
        Network Details
      </legend>
      <TextField
        id="wifi-ssid"
        label="Network Name (SSID)"
        type="text"
        placeholder="e.g. MyHomeNetwork"
        maxLength={32}
        value={data.ssid}
        onChange={(e) => onChange({ ssid: e.target.value })}
        showCharCount
      />

      <div className="flex-1">
        <SelectField
          id="wifi-encryption"
          label="Encryption"
          value={data.encryption}
          onChange={(e) =>
            onChange({ encryption: e.target.value as WifiEncryption })
          }
        >
          <option value={WifiEncryption.WPA}>
            WPA / WPA2 / WPA3 (Standard)
          </option>
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
          placeholder="e.g. user@domain.com"
          maxLength={128}
          value={data.eapIdentity}
          onChange={(e) => onChange({ eapIdentity: e.target.value })}
        />
      )}

      {data.encryption !== WifiEncryption.NOPASS && (
        <TextField
          id="wifi-password"
          name="password"
          label="Password"
          autoComplete="off"
          type="password"
          placeholder="Network password"
          maxLength={63}
          value={data.password}
          onChange={(e) => onChange({ password: e.target.value })}
          showPasswordToggle
          showCharCount
        />
      )}

      <CheckboxField
        id="wifi-hidden"
        label="Hidden Network"
        checked={data.hidden}
        onChange={(e) => onChange({ hidden: e.target.checked })}
        className="pt-2"
      />
    </fieldset>
  );
};
