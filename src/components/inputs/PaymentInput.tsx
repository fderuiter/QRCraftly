import React from "react";
import { PaymentData, CryptoNetwork } from "../../types";
import { TextField, SelectField } from "../ui/FormFields";
import { ValidationEngine } from "../../engine/ValidationEngine";

/**
 *
 */
interface PaymentInputProps {
  /**
   *
   */
  data: PaymentData;
  /**
   *
   */
  onChange: (updates: Partial<PaymentData>) => void;
}

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.onChange
 */
export const PaymentInput: React.FC<PaymentInputProps> = ({
  data,
  onChange,
}) => {
  const addressError = data.address && ValidationEngine.isDangerousUrl(data.address)
    ? "Unsafe URL scheme or malicious protocol detected."
    : undefined;

  return (
    <fieldset className="space-y-4 min-w-0">
      <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-full mb-3">
        Crypto Payment
      </legend>

      <SelectField
        id="payment-network"
        label="Currency / Network"
        value={data.network}
        onChange={(e) => onChange({ network: e.target.value as CryptoNetwork })}
      >
        <option value={CryptoNetwork.BITCOIN}>Bitcoin (BTC)</option>
        <option value={CryptoNetwork.ETHEREUM}>Ethereum (ETH)</option>
        <option value={CryptoNetwork.SOLANA}>Solana (SOL)</option>
        <option value={CryptoNetwork.LITECOIN}>Litecoin (LTC)</option>
        <option value={CryptoNetwork.CUSTOM}>Custom / Raw Address</option>
      </SelectField>

      <TextField
        id="payment-address"
        label="Receiver Address"
        type="text"
        maxLength={128}
        placeholder="Wallet Address"
        value={data.address}
        onChange={(e) => onChange({ address: e.target.value })}
        error={addressError}
      />

      {data.network !== CryptoNetwork.CUSTOM && (
        <>
          <TextField
            id="payment-amount"
            label="Amount"
            contextualLabel="Optional"
            type="number"
            step="any"
            max="999999999"
            placeholder="0.00"
            value={data.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
          <TextField
            id="payment-label"
            label="Label / Note"
            contextualLabel="Optional"
            type="text"
            maxLength={200}
            placeholder="e.g. Donation"
            value={data.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </>
      )}
    </fieldset>
  );
};
