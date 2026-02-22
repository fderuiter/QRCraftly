import { isDangerousUrl, sanitizeInput } from '../security';

/**
 * Supported cryptocurrency networks for payment.
 */
export enum CryptoNetwork {
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
  LITECOIN = 'litecoin',
  CUSTOM = 'custom',
}

/**
 * Data structure for Payment information (Crypto).
 */
export interface PaymentData {
  /** The cryptocurrency network (e.g. bitcoin, ethereum). */
  network: CryptoNetwork;
  /** The wallet address. */
  address: string;
  /** The amount to request (optional). */
  amount: string;
  /** Label or message for the transaction (optional). */
  label: string;
}

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
