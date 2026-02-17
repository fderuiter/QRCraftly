/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from 'react';
import { QRConfig, QRType, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData, WifiEncryption, CryptoNetwork } from '../types';
import {
  constructWifiString,
  constructEmailString,
  constructVCardString,
  constructPhoneString,
  constructSmsString,
  constructPaymentString
} from '../utils/qrHelpers';
import { useQRInputState } from '../utils/hooks';

import { TypeSelector } from './inputs/TypeSelector';
import { UrlInput } from './inputs/UrlInput';
import { TextInput } from './inputs/TextInput';
import { WifiInput } from './inputs/WifiInput';
import { EmailInput } from './inputs/EmailInput';
import { VCardInput } from './inputs/VCardInput';
import { PhoneInput } from './inputs/PhoneInput';
import { SmsInput } from './inputs/SmsInput';
import { PaymentInput } from './inputs/PaymentInput';

/**
 * Props for the InputPanel component.
 */
interface InputPanelProps {
  /** The current QR code configuration. */
  config: QRConfig;
  /** Callback to update the configuration. */
  onChange: (updates: Partial<QRConfig>) => void;
}

/**
 * A component that provides input fields for different QR code types.
 * Allows users to enter data for URL, Text, WiFi, Email, vCard, Phone, and SMS.
 * It updates the main configuration with the formatted string for the QR code.
 *
 * @param props - The component props.
 * @param props.config - The current QR code configuration state.
 * @param props.onChange - Callback function to update the configuration.
 * @returns The InputPanel component.
 */
const InputPanel: React.FC<InputPanelProps> = ({ config, onChange }) => {
  // We keep the state here to preserve data when switching types
  const [wifiData, handleWifiChange] = useQRInputState<WifiData>(
    { ssid: '', password: '', encryption: WifiEncryption.WPA, hidden: false, eapIdentity: '' },
    constructWifiString,
    onChange
  );

  const [emailData, handleEmailChange] = useQRInputState<EmailData>(
    { email: '', subject: '', body: '' },
    constructEmailString,
    onChange
  );

  const [vCardData, handleVCardChange] = useQRInputState<VCardData>(
    { firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '', street: '', city: '', country: '' },
    constructVCardString,
    onChange
  );

  const [phoneData, handlePhoneChange] = useQRInputState<PhoneData>(
    { number: '' },
    constructPhoneString,
    onChange
  );

  const [smsData, handleSmsChange] = useQRInputState<SmsData>(
    { number: '', message: '' },
    constructSmsString,
    onChange
  );

  const [paymentData, handlePaymentChange] = useQRInputState<PaymentData>(
    { network: CryptoNetwork.BITCOIN, address: '', amount: '', label: '' },
    constructPaymentString,
    onChange
  );

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <TypeSelector
        currentType={config.type}
        onSelect={(type) => onChange({ type, value: '' })}
      />

      {/* Inputs */}
      <div className="space-y-4">
        {config.type === QRType.URL && (
          <UrlInput
            value={config.value}
            onChange={(val) => onChange({ value: val })}
          />
        )}

        {config.type === QRType.TEXT && (
          <TextInput
            value={config.value}
            onChange={(val) => onChange({ value: val })}
          />
        )}

        {config.type === QRType.WIFI && (
          <WifiInput
            data={wifiData}
            onChange={handleWifiChange}
          />
        )}

        {config.type === QRType.EMAIL && (
          <EmailInput
            data={emailData}
            onChange={handleEmailChange}
          />
        )}

        {config.type === QRType.PAYMENT && (
          <PaymentInput
            data={paymentData}
            onChange={handlePaymentChange}
          />
        )}

        {config.type === QRType.VCARD && (
          <VCardInput
            data={vCardData}
            onChange={handleVCardChange}
          />
        )}

        {config.type === QRType.PHONE && (
          <PhoneInput
            data={phoneData}
            onChange={handlePhoneChange}
          />
        )}

        {config.type === QRType.SMS && (
          <SmsInput
            data={smsData}
            onChange={handleSmsChange}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Comparison function for React.memo.
 * Returns true if the next props are equivalent to the previous props (skipping re-render).
 * It ignores changes to 'fgColor', 'bgColor', 'style', etc. as they don't affect the input panel.
 */
function areInputPropsEqual(prev: InputPanelProps, next: InputPanelProps) {
  // If the onChange handler changed, we must re-render
  if (prev.onChange !== next.onChange) return false;

  // We only care about config.type and config.value for the input panel.
  // Style changes (colors, etc.) should NOT trigger a re-render of inputs.
  return prev.config.type === next.config.type &&
         prev.config.value === next.config.value;
}

export default React.memo(InputPanel, areInputPropsEqual);
