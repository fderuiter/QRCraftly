import React from 'react';
import { PaymentData, CryptoNetwork } from '../../types';
import { INPUT_CLASSES, SELECT_CLASSES } from './styles';

interface PaymentInputProps {
  data: PaymentData;
  onChange: (updates: Partial<PaymentData>) => void;
}

export const PaymentInput: React.FC<PaymentInputProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Crypto Payment</h3>

        <div>
            <label htmlFor="payment-network" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Currency / Network</label>
            <select
              id="payment-network"
              value={data.network}
              onChange={(e) => onChange({ network: e.target.value as CryptoNetwork })}
              className={SELECT_CLASSES}
            >
              <option value={CryptoNetwork.BITCOIN}>Bitcoin (BTC)</option>
              <option value={CryptoNetwork.ETHEREUM}>Ethereum (ETH)</option>
              <option value={CryptoNetwork.SOLANA}>Solana (SOL)</option>
              <option value={CryptoNetwork.LITECOIN}>Litecoin (LTC)</option>
              <option value={CryptoNetwork.CUSTOM}>Custom / Raw Address</option>
            </select>
        </div>

        <div>
             <label htmlFor="payment-address" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Receiver Address</label>
             <input
                id="payment-address"
                type="text"
                maxLength={128}
                placeholder="Wallet Address"
                value={data.address}
                onChange={(e) => onChange({ address: e.target.value })}
                className={INPUT_CLASSES}
             />
        </div>

        {data.network !== CryptoNetwork.CUSTOM && (
        <>
            <div>
                <label htmlFor="payment-amount" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount (Optional)</label>
                <input
                    id="payment-amount"
                    type="number"
                    step="any"
                    max="999999999"
                    placeholder="0.00"
                    value={data.amount}
                    onChange={(e) => onChange({ amount: e.target.value })}
                    className={INPUT_CLASSES}
                />
            </div>
            <div>
                <label htmlFor="payment-label" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Label / Note (Optional)</label>
                <input
                    id="payment-label"
                    type="text"
                    maxLength={200}
                    placeholder="e.g. Donation"
                    value={data.label}
                    onChange={(e) => onChange({ label: e.target.value })}
                    className={INPUT_CLASSES}
                />
            </div>
        </>
        )}
    </div>
  );
};
