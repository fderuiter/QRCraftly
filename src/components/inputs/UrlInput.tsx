import React from 'react';
import { isDangerousUrl } from '../../utils/security';
import { INPUT_CLASSES } from './styles';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ value, onChange }) => {
  return (
    <div>
      <label htmlFor="url-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
      <input
        id="url-input"
        suppressHydrationWarning={true}
        name="url"
        autoComplete="url"
        type="url"
        maxLength={2048}
        placeholder="https://example.com"
        className={INPUT_CLASSES}
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
