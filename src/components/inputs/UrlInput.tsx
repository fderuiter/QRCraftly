import React from "react";

import { UrlData } from "../../types";
import { ValidationEngine } from "../../engine/ValidationEngine";

import { TextField } from "./FormFields";

interface UrlInputProps {
  data: UrlData;
  onChange: (updates: Partial<UrlData>) => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ data, onChange }) => {
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
        value={data.url}
        onChange={(e) => {
          if (!ValidationEngine.isDangerousUrl(e.target.value)) {
            onChange({ url: e.target.value });
          } else {
            // Force reset the input value to prevent the dangerous string from persisting in the DOM
            e.target.value = data.url;
          }
        }}
      />
    </div>
  );
};
