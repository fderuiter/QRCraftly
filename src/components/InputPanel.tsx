import React, { useState } from 'react';
import { QRConfig, QRType, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData } from '../types';
import { Wifi, Link, Type, Mail, UserSquare2, Phone, MessageSquare, CreditCard, Eye, EyeOff } from 'lucide-react';
import {
  constructWifiString,
  constructEmailString,
  constructVCardString,
  constructPhoneString,
  constructSmsString,
  constructPaymentString
} from '../utils/qrHelpers';

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
 * Custom hook to manage input state for complex QR types (WiFi, Email, etc.).
 * Automatically updates the global QR config string when local input state changes.
 *
 * @param initialState - The initial state object for the input type.
 * @param constructorFn - Function to convert the state object to a QR code string.
 * @param onChange - The global config change handler.
 * @returns A tuple containing the current data and a function to update it.
 */
function useQRInputState<T>(
  initialState: T,
  constructorFn: (data: T) => string,
  onChange: (updates: Partial<QRConfig>) => void
) {
  const [data, setData] = useState<T>(initialState);

  const update = (updates: Partial<T>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    onChange({ value: constructorFn(newData) });
  };

  return [data, update] as const;
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
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const [wifiData, handleWifiChange] = useQRInputState<WifiData>(
    { ssid: '', password: '', encryption: 'WPA', hidden: false, eapIdentity: '' },
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
    { network: 'bitcoin', address: '', amount: '', label: '' },
    constructPaymentString,
    onChange
  );

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
            aria-pressed={config.type === item.type}
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
              maxLength={2048}
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
              maxLength={2500}
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
                maxLength={32}
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
                        maxLength={128}
                        value={wifiData.eapIdentity}
                        onChange={(e) => handleWifiChange({ eapIdentity: e.target.value })}
                        className={inputClasses}
                    />
                </div>
            )}

            {wifiData.encryption !== 'nopass' && (
                <div>
                <label htmlFor="wifi-password" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <input
                      id="wifi-password"
                      type={showWifiPassword ? 'text' : 'password'}
                      maxLength={63}
                      value={wifiData.password}
                      onChange={(e) => handleWifiChange({ password: e.target.value })}
                      className={`${inputClasses} pr-10`}
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
                        maxLength={254}
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
                        maxLength={200}
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
                        maxLength={2000}
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
                        maxLength={128}
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
                            max="999999999"
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
                            maxLength={200}
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
                        <input id="vcard-firstname" type="text" maxLength={100} value={vCardData.firstName} onChange={(e) => handleVCardChange({ firstName: e.target.value })} className={inputClasses} />
                     </div>
                     <div>
                        <label htmlFor="vcard-lastname" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name</label>
                        <input id="vcard-lastname" type="text" maxLength={100} value={vCardData.lastName} onChange={(e) => handleVCardChange({ lastName: e.target.value })} className={inputClasses} />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="vcard-phone" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mobile Phone</label>
                        <input id="vcard-phone" type="tel" maxLength={20} value={vCardData.phone} onChange={(e) => handleVCardChange({ phone: e.target.value })} className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="vcard-email" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                        <input id="vcard-email" type="email" maxLength={254} value={vCardData.email} onChange={(e) => handleVCardChange({ email: e.target.value })} className={inputClasses} />
                    </div>
                 </div>

                 <div>
                    <label htmlFor="vcard-org" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Company / Organization</label>
                    <input id="vcard-org" type="text" maxLength={100} value={vCardData.organization} onChange={(e) => handleVCardChange({ organization: e.target.value })} className={inputClasses} />
                 </div>
                 
                 <div>
                    <label htmlFor="vcard-title" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Job Title</label>
                    <input id="vcard-title" type="text" maxLength={100} value={vCardData.title} onChange={(e) => handleVCardChange({ title: e.target.value })} className={inputClasses} />
                 </div>

                 <div>
                    <label htmlFor="vcard-website" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Website</label>
                    <input id="vcard-website" type="url" maxLength={2048} value={vCardData.website} onChange={(e) => handleVCardChange({ website: e.target.value })} className={inputClasses} />
                 </div>

                 <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Address</label>
                    <div className="space-y-3">
                        <input aria-label="Street" type="text" maxLength={100} placeholder="Street" value={vCardData.street} onChange={(e) => handleVCardChange({ street: e.target.value })} className={inputClasses} />
                        <div className="grid grid-cols-2 gap-3">
                             <input aria-label="City" type="text" maxLength={100} placeholder="City" value={vCardData.city} onChange={(e) => handleVCardChange({ city: e.target.value })} className={inputClasses} />
                             <input aria-label="Country" type="text" maxLength={100} placeholder="Country" value={vCardData.country} onChange={(e) => handleVCardChange({ country: e.target.value })} className={inputClasses} />
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
                    maxLength={20}
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
                        maxLength={20}
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
                        maxLength={1600}
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
