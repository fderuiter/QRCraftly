import React from 'react';
import { PaymentData, CryptoNetwork } from '../../utils/qr-formatters/payment';
import { TextField, SelectField } from './FormFields';

interface PaymentInputProps {
  data: PaymentData;
  onChange: (updates: Partial<PaymentData>) => void;
}

export const PaymentInput: React.FC<PaymentInputProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Crypto Payment</h3>

        <SelectField
            id="payment-network"
            label="Currency / Network"
            value={data.network}
            onChange={(e) => onChange({ network: e.target.value as CryptoNetwork })}
            fieldSize="xs"
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
             fieldSize="xs"
        />

        {data.network !== CryptoNetwork.CUSTOM && (
        <>
            <TextField
                id="payment-amount"
                label="Amount (Optional)"
                type="number"
                step="any"
                max="999999999"
                placeholder="0.00"
                value={data.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
                fieldSize="xs"
            />
            <TextField
                id="payment-label"
                label="Label / Note (Optional)"
                type="text"
                maxLength={200}
                placeholder="e.g. Donation"
                value={data.label}
                onChange={(e) => onChange({ label: e.target.value })}
                fieldSize="xs"
            />
        </>
        )}
    </div>
  );
};
