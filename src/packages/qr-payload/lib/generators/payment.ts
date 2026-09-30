/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import { PaymentData, CryptoNetwork, QRType, QRGeneratorContract } from '@/types';
import { isDangerousUrl, sanitizeInput } from '@/utils/security';
import { identifyProtocol, safeDecodeURIComponent } from '../protocol';

/** Number of wei in one ether (10^18), as used by EIP-681 `value=`. */
const WEI_DECIMALS = 18;

/**
 * Converts a decimal ether amount to an integer wei string using exact string
 * arithmetic (no floating point), e.g. "0.1" -> "100000000000000000".
 * @param amount - The decimal ether amount entered by the user.
 * @returns The wei amount, or null when the input is not a plain non-negative
 * decimal or has more than 18 fractional digits.
 */
const etherToWei = (amount: string): string | null => {
  // eslint-disable-next-line security/detect-unsafe-regex -- linear: the digit runs are separated by a literal '.' and anchored.
  const match = /^(\d*)(?:\.(\d*))?$/.exec(amount.trim());
  if (!match) return null;
  const whole = match[1] || '';
  const fraction = match[2] || '';
  if (!whole && !fraction) return null;
  if (fraction.length > WEI_DECIMALS) return null;
  const digits = (whole + fraction.padEnd(WEI_DECIMALS, '0')).replace(/^0+/, '');
  return digits || '0';
};

/**
 * Converts an EIP-681 `value=` (integer wei, optionally in scientific notation such
 * as `2.014e18`) back to a decimal ether amount using exact string arithmetic.
 * @param value - The raw `value` parameter.
 * @returns The ether amount without trailing zeros, or null when it is not a valid integer amount.
 */
const weiToEther = (value: string): string | null => {
  // eslint-disable-next-line security/detect-unsafe-regex -- linear: digit runs are separated by literal '.' / 'e' and anchored.
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]\+?(\d+))?$/.exec(value.trim());
  if (!match) return null;
  const intPart = match[1];
  const fracPart = match[2] || '';
  const exponent = match[3] ? parseInt(match[3], 10) : 0;
  if (fracPart.length > exponent) return null; // not a whole number of wei
  const wei = (intPart + fracPart.padEnd(exponent, '0')).replace(/^0+/, '') || '0';
  const padded = wei.padStart(WEI_DECIMALS + 1, '0');
  const whole = padded.slice(0, padded.length - WEI_DECIMALS);
  const fraction = padded.slice(padded.length - WEI_DECIMALS).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
};

/**
 * Percent-encodes a wallet address so `&`, `#`, `%` or whitespace cannot inject
 * URI parameters. `@` is kept for EIP-681 chain ids (`address@chainId`).
 */
const encodeAddress = (address: string): string => {
  return encodeURIComponent(address.trim()).replace(/%40/g, '@');
};

/**
 * Constructs the crypto payment URI string.
 */
export const constructPaymentString = (data: PaymentData): string => {
  if (!data) return '';
  let paymentString = '';

  if (data.network === CryptoNetwork.CUSTOM) {
    if (isDangerousUrl(data.address)) {
      return '';
    }
    paymentString = data.address;
  } else {
    // Ensure network is a valid known network to prevent protocol injection
    const validNetworks = [
      CryptoNetwork.BITCOIN,
      CryptoNetwork.ETHEREUM,
      CryptoNetwork.SOLANA,
      CryptoNetwork.LITECOIN,
    ];

    if (!validNetworks.includes(data.network)) {
      return '';
    }

    // Sanitize address to prevent parameter injection if user accidentally pastes a full URI or malicious string
    const safeAddress = encodeAddress(sanitizeInput(data.address || ''));
    paymentString = `${data.network}:${safeAddress}`;
    const params: string[] = [];

    if (data.amount) {
      if (data.network === CryptoNetwork.ETHEREUM) {
        // EIP-681: the amount is `value=` in wei; wallets ignore `amount=`.
        const wei = etherToWei(data.amount);
        if (wei !== null) {
          params.push(`value=${wei}`);
        }
      } else {
        // Encode amount to prevent parameter injection
        params.push(`amount=${encodeURIComponent(data.amount)}`);
      }
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

/**
 * Hydrates PaymentData from a raw string.
 */
export const hydratePaymentData = (raw: string): PaymentData => {
  const result: PaymentData = {
    network: CryptoNetwork.BITCOIN,
    address: '',
    amount: '',
    label: '',
  };

  if (!raw || typeof raw !== 'string') return result;

  const validNetworks = [
    CryptoNetwork.BITCOIN,
    CryptoNetwork.ETHEREUM,
    CryptoNetwork.SOLANA,
    CryptoNetwork.LITECOIN,
  ];

  const colonIndex = raw.indexOf(':');
  if (colonIndex !== -1) {
    const networkPart = raw.substring(0, colonIndex) as CryptoNetwork;
    if (validNetworks.includes(networkPart)) {
      result.network = networkPart;

      const rest = raw.substring(colonIndex + 1);
      const qIndex = rest.indexOf('?');
      if (qIndex !== -1) {
        result.address = safeDecodeURIComponent(rest.substring(0, qIndex));
        const query = rest.substring(qIndex + 1);
        const params = new URLSearchParams(query);
        const weiValue = params.get('value');
        const ether =
          networkPart === CryptoNetwork.ETHEREUM && weiValue ? weiToEther(weiValue) : null;
        result.amount = ether ?? (params.get('amount') || '');
        result.label = params.get('label') || '';
      } else {
        result.address = safeDecodeURIComponent(rest);
      }
      return result;
    }
  }

  // If it doesn't match a known crypto network, we assume it's either an invalid
  // string (e.g. switching types) or a CUSTOM string.
  // We'll return it as CUSTOM so it can be edited, but if it starts with http/https
  // we return default state so it falls back to the default BITCOIN state silently.
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return {
      network: CryptoNetwork.BITCOIN,
      address: '',
      amount: '',
      label: '',
    };
  }

  result.network = CryptoNetwork.CUSTOM;
  result.address = raw;
  return result;
};

export const PaymentContract: QRGeneratorContract<PaymentData> = {
  type: QRType.PAYMENT,
  construct: constructPaymentString,
  hydrate: hydratePaymentData,
  matches: (raw: string) => identifyProtocol(raw) === QRType.PAYMENT,
  validate: (raw: string) => {
    const violations: string[] = [];
    if (raw && isDangerousUrl(raw)) {
      violations.push('URI_INJECTION_VIOLATION');
    }
    return violations;
  },
};
