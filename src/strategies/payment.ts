import { PaymentData, CryptoNetwork } from '../types';
import { PaymentInput } from '../components/inputs/PaymentInput';
import { isDangerousUrl, sanitizeInput } from '../utils/security';

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

export const PaymentStrategy = {
  initialState: { network: CryptoNetwork.BITCOIN, address: '', amount: '', label: '' } as PaymentData,
  constructString: constructPaymentString,
  InputComponent: PaymentInput,
};
