import React from 'react';
import { isDangerousUrl } from '../../utils/security';
import { TextField } from './FormFields';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ value, onChange }) => {
  return (
    <div>
      <TextField
        id="url-input"
        label="Website URL"
        suppressHydrationWarning={true}
        name="url"
        autoComplete="url"
        type="url"
        maxLength={2048}
        placeholder="https://example.com"
        value={value}
        onChange={(e) => {
          if (!isDangerousUrl(e.target.value)) {
            onChange(e.target.value);
          } else {
            // Force reset the input value to prevent the dangerous string from persisting in the DOM
            e.target.value = value;
          }
        }}
      />
    </div>
  );
};
