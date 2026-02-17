import { QRConfig, QRType, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData, WifiEncryption, CryptoNetwork } from '../../types';
import {
  constructWifiString,
  constructEmailString,
  constructVCardString,
  constructPhoneString,
  constructSmsString,
  constructPaymentString
} from '../../utils/qrHelpers';
import { useQRInputState } from '../../utils/hooks';

export const useInputLogic = (config: QRConfig, onChange: (updates: Partial<QRConfig>) => void) => {
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

  // URL and TEXT inputs are controlled directly by config.value
  const handleSimpleChange = (value: string) => {
    onChange({ value });
  };

  return {
    [QRType.URL]: { data: config.value, onChange: handleSimpleChange },
    [QRType.TEXT]: { data: config.value, onChange: handleSimpleChange },
    [QRType.WIFI]: { data: wifiData, onChange: handleWifiChange },
    [QRType.EMAIL]: { data: emailData, onChange: handleEmailChange },
    [QRType.VCARD]: { data: vCardData, onChange: handleVCardChange },
    [QRType.PHONE]: { data: phoneData, onChange: handlePhoneChange },
    [QRType.SMS]: { data: smsData, onChange: handleSmsChange },
    [QRType.PAYMENT]: { data: paymentData, onChange: handlePaymentChange },
  };
};
