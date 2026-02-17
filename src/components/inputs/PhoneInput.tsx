import React from 'react';
import { PhoneData } from '../../types';
import { INPUT_CLASSES } from './styles';

interface PhoneInputProps {
  data: PhoneData;
  onChange: (updates: Partial<PhoneData>) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ data, onChange }) => {
  return (
    <div>
         <label htmlFor="phone-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
         <input
            id="phone-number"
            name="phone"
            autoComplete="tel"
            type="tel"
            maxLength={20}
            placeholder="+1 555 000 0000"
            value={data.number}
            onChange={(e) => onChange({ number: e.target.value })}
            className={INPUT_CLASSES}
         />
    </div>
  );
};
