import React from 'react';
import { TextAreaField } from './FormFields';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange }) => {
  return (
    <div>
      <TextAreaField
        id="text-content"
        label="Content"
        rows={4}
        maxLength={2500}
        placeholder="Enter your text here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        showCharCount
      />
    </div>
  );
};
