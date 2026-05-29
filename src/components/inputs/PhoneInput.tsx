import React from 'react';
import { PhoneData } from '../../types';
import { TextField } from './FormFields';

interface PhoneInputProps {
  data: PhoneData;
  onChange: (updates: Partial<PhoneData>) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ data, onChange }) => {
  return (
    <div>
      <TextField
        id="phone-number"
        name="phone"
        label="Phone Number"
        autoComplete="tel"
        type="tel"
        maxLength={20}
        placeholder="+1 555 000 0000"
        value={data.number}
        onChange={(e) => onChange({ number: e.target.value })}
      />
    </div>
  );
};
