import React, { useState, useEffect } from 'react';
import { QRConfig, QRType, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData } from '../types';
import { Wifi, Link, Type, Mail, UserSquare2, Phone, MessageSquare, CreditCard } from 'lucide-react';

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
  const [wifiData, setWifiData] = useState<WifiData>({ ssid: '', password: '', encryption: 'WPA', hidden: false, eapIdentity: '' });
  const [emailData, setEmailData] = useState<EmailData>({ email: '', subject: '', body: '' });
  const [vCardData, setVCardData] = useState<VCardData>({ 
    firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '', street: '', city: '', country: '' 
  });
  const [phoneData, setPhoneData] = useState<PhoneData>({ number: '' });
  const [smsData, setSmsData] = useState<SmsData>({ number: '', message: '' });
  const [paymentData, setPaymentData] = useState<PaymentData>({
    network: 'bitcoin', address: '', amount: '', label: ''
  });

  // Helper functions

  /**
   * Escapes special characters for WiFi QR code string.
   * Characters to escape: \ ; , " :
   *
   * @param str - The string to escape.
   * @returns The escaped string.
   */
  const escapeWifiString = (str: string | undefined): string => {
    if (!str) return '';
    return str.replace(/([\\;,":])/g, '\\$1');
  };

  /**
   * Escapes special characters for vCard property values.
   * Characters to escape: \ ; , and newlines.
   *
   * @param str - The string to escape.
   * @returns The escaped string.
   */
  const escapeVCardString = (str: string | undefined): string => {
    if (!str) return '';
    // 1. Escape backslashes first to avoid double escaping
    // 2. Escape newlines as \n
    // 3. Escape commas and semicolons
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/([;,])/g, '\\$1');
  };

  // String construction helpers

  const constructWifiString = (data: WifiData) => {
    let wifiString = '';
    const ssid = escapeWifiString(data.ssid);
    const hidden = data.hidden;

    if (data.encryption === 'WPA2-EAP') {
        const identity = escapeWifiString(data.eapIdentity);
        const password = escapeWifiString(data.password);
        wifiString = `WIFI:T:WPA2-EAP;S:${ssid};I:${identity};P:${password};H:${hidden};;`;
    } else {
        if (data.encryption === 'nopass') {
            wifiString = `WIFI:T:${data.encryption};S:${ssid};H:${hidden};;`;
        } else {
            const password = escapeWifiString(data.password);
            wifiString = `WIFI:T:${data.encryption};S:${ssid};P:${password};H:${hidden};;`;
        }
    }
    return wifiString;
  };

  const constructEmailString = (data: EmailData) => {
    return `mailto:${data.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
  };

  const constructVCardString = (data: VCardData) => {
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

  const constructPhoneString = (data: PhoneData) => {
      const cleanNumber = data.number.replace(/[\s:]+/g, '');
      return `tel:${cleanNumber}`;
  };

  const constructSmsString = (data: SmsData) => {
      const cleanNumber = data.number.replace(/[\s:]+/g, '');
      return `smsto:${cleanNumber}:${data.message}`;
  };

  const constructPaymentString = (data: PaymentData) => {
    let paymentString = '';
    if (data.network === 'custom') {
         paymentString = data.address;
    } else {
        paymentString = `${data.network}:${data.address}`;
        const params: string[] = [];

        if (data.amount) {
            params.push(`amount=${data.amount}`);
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

  // Sync effect to handle type changes
  useEffect(() => {
    // Only update if value is empty (meaning we just switched type and parent reset it)
    // Or should we always update to match local state?
    // If we only update when empty, it handles the switch case.
    // But config.value might be outdated if we edited and switched away and back?
    // The parent sets value='' on click.

    // We only trigger this logic if the type matches the state we hold.
    // And we should check if the generated string is DIFFERENT from current config.value
    // But config.value is passed in.

    let newValue = '';
    switch (config.type) {
        case QRType.WIFI:
            newValue = constructWifiString(wifiData);
            break;
        case QRType.EMAIL:
            newValue = constructEmailString(emailData);
            break;
        case QRType.VCARD:
            newValue = constructVCardString(vCardData);
            break;
        case QRType.PHONE:
            newValue = constructPhoneString(phoneData);
            break;
        case QRType.SMS:
            newValue = constructSmsString(smsData);
            break;
        case QRType.PAYMENT:
            newValue = constructPaymentString(paymentData);
            break;
        // URL and TEXT are stateless (controlled by parent input directly usually)
        // Wait, URL and TEXT inputs below use config.value directly.
        // So they don't have local state.
        default:
            return;
    }

    // If the constructed value is not empty/default, we sync it.
    // Even if it is default, we might want to sync it if we are switching back.
    if (newValue !== config.value) {
        onChange({ value: newValue });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.type]); // Only run when type changes (to restore state)

  // Update handlers

  const handleWifiChange = (updates: Partial<WifiData>) => {
    const newData = { ...wifiData, ...updates };
    setWifiData(newData);
    onChange({ value: constructWifiString(newData) });
  };

  const handleEmailChange = (updates: Partial<EmailData>) => {
    const newData = { ...emailData, ...updates };
    setEmailData(newData);
    onChange({ value: constructEmailString(newData) });
  };

  const handleVCardChange = (updates: Partial<VCardData>) => {
      const newData = { ...vCardData, ...updates };
      setVCardData(newData);
      onChange({ value: constructVCardString(newData) });
  };

  const handlePhoneChange = (updates: Partial<PhoneData>) => {
      const newData = { ...phoneData, ...updates };
      setPhoneData(newData);
      onChange({ value: constructPhoneString(newData) });
  };

  const handleSmsChange = (updates: Partial<SmsData>) => {
      const newData = { ...smsData, ...updates };
      setSmsData(newData);
      onChange({ value: constructSmsString(newData) });
  };

  const handlePaymentChange = (updates: Partial<PaymentData>) => {
    const newData = { ...paymentData, ...updates };
    setPaymentData(newData);
    onChange({ value: constructPaymentString(newData) });
  };

  const inputClasses = "w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 focus:border-teal-500 outline-none transition-all text-slate-700 dark:text-slate-100 placeholder-slate-400 font-mono text-sm";
  const textAreaClasses = "w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 focus:border-teal-500 outline-none transition-all text-slate-700 dark:text-slate-100 placeholder-slate-400 font-sans text-sm";
  const selectClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 focus:border-teal-500 outline-none text-slate-700 dark:text-slate-100 font-mono";

  return (
    <div className="space-y-6">
      {/* Type Selector - Scrollable Grid */}
      <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors duration-300">
        {[
          { type: QRType.URL, icon: Link, label: 'URL' },
          { type: QRType.TEXT, icon: Type, label: 'Text' },
          { type: QRType.WIFI, icon: Wifi, label: 'WiFi' },
          { type: QRType.VCARD, icon: UserSquare2, label: 'Contact' },
          { type: QRType.EMAIL, icon: Mail, label: 'Email' },
          { type: QRType.PHONE, icon: Phone, label: 'Phone' },
          { type: QRType.SMS, icon: MessageSquare, label: 'SMS' },
          { type: QRType.PAYMENT, icon: CreditCard, label: 'Payment' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => onChange({ type: item.type, value: '' })}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
              config.type === item.type
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="truncate w-full text-center text-slate-700 dark:text-slate-200">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        {config.type === QRType.URL && (
          <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
            <input
              id="url-input"
              type="url"
              placeholder="https://example.com"
              className={inputClasses}
              value={config.value}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </div>
        )}

        {config.type === QRType.TEXT && (
          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
            <textarea
              id="text-content"
              rows={4}
              placeholder="Enter your text here..."
              className={textAreaClasses}
              value={config.value}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </div>
        )}

        {config.type === QRType.WIFI && (
          <div className="space-y-3">
             <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Network Details</h3>
            <div>
              <label htmlFor="wifi-ssid" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Network Name (SSID)</label>
              <input
                id="wifi-ssid"
                type="text"
                value={wifiData.ssid}
                onChange={(e) => handleWifiChange({ ssid: e.target.value })}
                className={inputClasses}
              />
            </div>
            
            <div className="flex-1">
                <label htmlFor="wifi-encryption" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Encryption</label>
                <select
                  id="wifi-encryption"
                  value={wifiData.encryption}
                  onChange={(e) => handleWifiChange({ encryption: e.target.value as any })}
                  className={selectClasses}
                >
                  <option value="WPA">WPA / WPA2 / WPA3 (Standard)</option>
                  <option value="WEP">WEP (Legacy)</option>
                  <option value="WPA2-EAP">WPA2 Enterprise (EAP)</option>
                  <option value="nopass">None (Open Network)</option>
                </select>
            </div>

            {wifiData.encryption === 'WPA2-EAP' && (
                <div>
                    <label htmlFor="wifi-identity" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Identity / Username</label>
                    <input
                        id="wifi-identity"
                        type="text"
                        value={wifiData.eapIdentity}
                        onChange={(e) => handleWifiChange({ eapIdentity: e.target.value })}
                        className={inputClasses}
                    />
                </div>
            )}

            {wifiData.encryption !== 'nopass' && (
                <div>
                <label htmlFor="wifi-password" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Password</label>
                <input
                    id="wifi-password"
                    type="text"
                    value={wifiData.password}
                    onChange={(e) => handleWifiChange({ password: e.target.value })}
                    className={inputClasses}
                />
                </div>
            )}
            
            <div className="flex items-center pt-2">
                <label htmlFor="wifi-hidden" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="wifi-hidden"
                    type="checkbox"
                    checked={wifiData.hidden}
                    onChange={(e) => handleWifiChange({ hidden: e.target.checked })}
                    className="rounded text-teal-700 dark:text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-sans">Hidden Network</span>
                </label>
            </div>
          </div>
        )}

        {config.type === QRType.EMAIL && (
            <div className="space-y-3">
                <div>
                    <label htmlFor="email-address" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                    <input
                        id="email-address"
                        type="email"
                        value={emailData.email}
                        onChange={(e) => handleEmailChange({ email: e.target.value })}
                        className={inputClasses}
                    />
                </div>
                <div>
                    <label htmlFor="email-subject" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subject</label>
                    <input
                        id="email-subject"
                        type="text"
                        value={emailData.subject}
                        onChange={(e) => handleEmailChange({ subject: e.target.value })}
                        className={inputClasses}
                    />
                </div>
                <div>
                    <label htmlFor="email-body" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Body</label>
                    <textarea
                        id="email-body"
                        rows={3}
                        value={emailData.body}
                        onChange={(e) => handleEmailChange({ body: e.target.value })}
                        className={textAreaClasses}
                    />
                </div>
            </div>
        )}

        {config.type === QRType.PAYMENT && (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Crypto Payment</h3>

                <div>
                    <label htmlFor="payment-network" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Currency / Network</label>
                    <select
                      id="payment-network"
                      value={paymentData.network}
                      onChange={(e) => handlePaymentChange({ network: e.target.value })}
                      className={selectClasses}
                    >
                      <option value="bitcoin">Bitcoin (BTC)</option>
                      <option value="ethereum">Ethereum (ETH)</option>
                      <option value="solana">Solana (SOL)</option>
                      <option value="litecoin">Litecoin (LTC)</option>
                      <option value="custom">Custom / Raw Address</option>
                    </select>
                </div>

                <div>
                     <label htmlFor="payment-address" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Receiver Address</label>
                     <input
                        id="payment-address"
                        type="text"
                        placeholder="Wallet Address"
                        value={paymentData.address}
                        onChange={(e) => handlePaymentChange({ address: e.target.value })}
                        className={inputClasses}
                     />
                </div>

                {paymentData.network !== 'custom' && (
                <>
                    <div>
                        <label htmlFor="payment-amount" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount (Optional)</label>
                        <input
                            id="payment-amount"
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={paymentData.amount}
                            onChange={(e) => handlePaymentChange({ amount: e.target.value })}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label htmlFor="payment-label" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Label / Note (Optional)</label>
                        <input
                            id="payment-label"
                            type="text"
                            placeholder="e.g. Donation"
                            value={paymentData.label}
                            onChange={(e) => handlePaymentChange({ label: e.target.value })}
                            className={inputClasses}
                        />
                    </div>
                </>
                )}
            </div>
        )}

        {config.type === QRType.VCARD && (
            <div className="space-y-3">
                 <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contact Details (vCard)</h3>
                 <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label htmlFor="vcard-firstname" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">First Name</label>
                        <input id="vcard-firstname" type="text" value={vCardData.firstName} onChange={(e) => handleVCardChange({ firstName: e.target.value })} className={inputClasses} />
                     </div>
                     <div>
                        <label htmlFor="vcard-lastname" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name</label>
                        <input id="vcard-lastname" type="text" value={vCardData.lastName} onChange={(e) => handleVCardChange({ lastName: e.target.value })} className={inputClasses} />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="vcard-phone" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mobile Phone</label>
                        <input id="vcard-phone" type="tel" value={vCardData.phone} onChange={(e) => handleVCardChange({ phone: e.target.value })} className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="vcard-email" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                        <input id="vcard-email" type="email" value={vCardData.email} onChange={(e) => handleVCardChange({ email: e.target.value })} className={inputClasses} />
                    </div>
                 </div>

                 <div>
                    <label htmlFor="vcard-org" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Company / Organization</label>
                    <input id="vcard-org" type="text" value={vCardData.organization} onChange={(e) => handleVCardChange({ organization: e.target.value })} className={inputClasses} />
                 </div>
                 
                 <div>
                    <label htmlFor="vcard-title" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Job Title</label>
                    <input id="vcard-title" type="text" value={vCardData.title} onChange={(e) => handleVCardChange({ title: e.target.value })} className={inputClasses} />
                 </div>

                 <div>
                    <label htmlFor="vcard-website" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Website</label>
                    <input id="vcard-website" type="url" value={vCardData.website} onChange={(e) => handleVCardChange({ website: e.target.value })} className={inputClasses} />
                 </div>

                 <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Address</label>
                    <div className="space-y-3">
                        <input aria-label="Street" type="text" placeholder="Street" value={vCardData.street} onChange={(e) => handleVCardChange({ street: e.target.value })} className={inputClasses} />
                        <div className="grid grid-cols-2 gap-3">
                             <input aria-label="City" type="text" placeholder="City" value={vCardData.city} onChange={(e) => handleVCardChange({ city: e.target.value })} className={inputClasses} />
                             <input aria-label="Country" type="text" placeholder="Country" value={vCardData.country} onChange={(e) => handleVCardChange({ country: e.target.value })} className={inputClasses} />
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {config.type === QRType.PHONE && (
            <div>
                 <label htmlFor="phone-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                 <input
                    id="phone-number"
                    type="tel"
                    placeholder="+1 555 000 0000"
                    value={phoneData.number}
                    onChange={(e) => handlePhoneChange({ number: e.target.value })}
                    className={inputClasses}
                 />
            </div>
        )}

        {config.type === QRType.SMS && (
            <div className="space-y-3">
                <div>
                     <label htmlFor="sms-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                     <input
                        id="sms-number"
                        type="tel"
                        placeholder="+1 555 000 0000"
                        value={smsData.number}
                        onChange={(e) => handleSmsChange({ number: e.target.value })}
                        className={inputClasses}
                     />
                </div>
                <div>
                    <label htmlFor="sms-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pre-filled Message</label>
                    <textarea
                        id="sms-message"
                        rows={3}
                        value={smsData.message}
                        onChange={(e) => handleSmsChange({ message: e.target.value })}
                        className={textAreaClasses}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default InputPanel;
