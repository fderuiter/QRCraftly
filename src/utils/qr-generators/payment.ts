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

import { PaymentData, CryptoNetwork } from "../../types";
import { sanitizeInput, isDangerousUrl } from "../security";

/**
 * Constructs the crypto payment URI string.
 */
export const constructPaymentString = (data: PaymentData): string => {
  let paymentString = "";

  if (data.network === CryptoNetwork.CUSTOM) {
    if (isDangerousUrl(data.address)) {
      return "";
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
      return "";
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
      paymentString += `?${params.join("&")}`;
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
    address: "",
    amount: "",
    label: "",
  };

  const validNetworks = [
    CryptoNetwork.BITCOIN,
    CryptoNetwork.ETHEREUM,
    CryptoNetwork.SOLANA,
    CryptoNetwork.LITECOIN,
  ];

  const colonIndex = raw.indexOf(":");
  if (colonIndex !== -1) {
    const networkPart = raw.substring(0, colonIndex) as CryptoNetwork;
    if (validNetworks.includes(networkPart)) {
      result.network = networkPart;

      const rest = raw.substring(colonIndex + 1);
      const qIndex = rest.indexOf("?");
      if (qIndex !== -1) {
        result.address = rest.substring(0, qIndex);
        const query = rest.substring(qIndex + 1);
        const params = new URLSearchParams(query);
        result.amount = params.get("amount") || "";
        result.label = params.get("label") || "";
      } else {
        result.address = rest;
      }
      return result;
    }
  }

  // If it doesn't match a known crypto network, we assume it's either an invalid
  // string (e.g. switching types) or a CUSTOM string.
  // We'll return it as CUSTOM so it can be edited, but if it starts with http/https
  // we throw so it falls back to the default BITCOIN state.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    throw new Error("Invalid payment string");
  }

  result.network = CryptoNetwork.CUSTOM;
  result.address = raw;
  return result;
};
