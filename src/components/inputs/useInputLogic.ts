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

import type { ElementType } from 'react';
import { QRConfig, QRType, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData } from '../../types';
import { useQRInputState } from '../../utils/hooks';

import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';

// Import Strategies
import { WifiStrategy } from '../../strategies/wifi';
import { EmailStrategy } from '../../strategies/email';
import { VCardStrategy } from '../../strategies/vcard';
import { PhoneStrategy } from '../../strategies/phone';
import { SmsStrategy } from '../../strategies/sms';
import { PaymentStrategy } from '../../strategies/payment';

/**
 * Hook to encapsulate the state management and component selection logic for the InputPanel.
 * It maintains the state for each input type so that data is preserved when switching types.
 *
 * @param config - The current QR configuration.
 * @param onChange - Callback to update the configuration.
 * @returns An object containing the component to render and its props.
 */
export function useInputLogic(config: QRConfig, onChange: (updates: Partial<QRConfig>) => void): { InputComponent: ElementType | null, inputProps: any } {
  // We keep the state here to preserve data when switching types
  const [wifiData, handleWifiChange] = useQRInputState<WifiData>(
    WifiStrategy.initialState,
    WifiStrategy.constructString,
    onChange
  );

  const [emailData, handleEmailChange] = useQRInputState<EmailData>(
    EmailStrategy.initialState,
    EmailStrategy.constructString,
    onChange
  );

  const [vCardData, handleVCardChange] = useQRInputState<VCardData>(
    VCardStrategy.initialState,
    VCardStrategy.constructString,
    onChange
  );

  const [phoneData, handlePhoneChange] = useQRInputState<PhoneData>(
    PhoneStrategy.initialState,
    PhoneStrategy.constructString,
    onChange
  );

  const [smsData, handleSmsChange] = useQRInputState<SmsData>(
    SmsStrategy.initialState,
    SmsStrategy.constructString,
    onChange
  );

  const [paymentData, handlePaymentChange] = useQRInputState<PaymentData>(
    PaymentStrategy.initialState,
    PaymentStrategy.constructString,
    onChange
  );

  switch (config.type) {
    case QRType.URL:
      return {
        InputComponent: UrlInput,
        inputProps: {
          value: config.value,
          onChange: (val: string) => onChange({ value: val })
        }
      };
    case QRType.TEXT:
      return {
        InputComponent: TextInput,
        inputProps: {
          value: config.value,
          onChange: (val: string) => onChange({ value: val })
        }
      };
    case QRType.WIFI:
      return {
        InputComponent: WifiStrategy.InputComponent,
        inputProps: {
          data: wifiData,
          onChange: handleWifiChange
        }
      };
    case QRType.EMAIL:
      return {
        InputComponent: EmailStrategy.InputComponent,
        inputProps: {
          data: emailData,
          onChange: handleEmailChange
        }
      };
    case QRType.PAYMENT:
      return {
        InputComponent: PaymentStrategy.InputComponent,
        inputProps: {
          data: paymentData,
          onChange: handlePaymentChange
        }
      };
    case QRType.VCARD:
      return {
        InputComponent: VCardStrategy.InputComponent,
        inputProps: {
          data: vCardData,
          onChange: handleVCardChange
        }
      };
    case QRType.PHONE:
      return {
        InputComponent: PhoneStrategy.InputComponent,
        inputProps: {
          data: phoneData,
          onChange: handlePhoneChange
        }
      };
    case QRType.SMS:
      return {
        InputComponent: SmsStrategy.InputComponent,
        inputProps: {
          data: smsData,
          onChange: handleSmsChange
        }
      };
    default:
      return {
        InputComponent: null,
        inputProps: {}
      };
  }
}
