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

import { PaymentData, CryptoNetwork } from '../../types';
import { sanitizeInput, isDangerousUrl } from '../security';

/**
 * Constructs the crypto payment URI string.
 */
export const constructPaymentString = (data: PaymentData): string => {
  let paymentString = '';

  if (data.network === CryptoNetwork.CUSTOM) {
    if (isDangerousUrl(data.address)) {
      return '';
    }
    paymentString = data.address;
  } else {
    // Ensure network is a valid known network to prevent protocol injection
    const validNetworks = [CryptoNetwork.BITCOIN, CryptoNetwork.ETHEREUM, CryptoNetwork.SOLANA, CryptoNetwork.LITECOIN];

    if (!validNetworks.includes(data.network)) {
      return '';
    }

    // Sanitize address to prevent parameter injection if user accidentally pastes a full URI or malicious string
    const safeAddress = sanitizeInput(data.address);
    paymentString = `${data.network}:${safeAddress}`;
    const params: string[] = [];

    if (data.amount) {
      // Encode amount to prevent parameter injection
      params.push(`amount=${encodeURIComponent(data.amount)}`);
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
