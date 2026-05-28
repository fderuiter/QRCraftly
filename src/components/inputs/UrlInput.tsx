import React from "react";
import { UrlData } from "../../types";
import { isDangerousUrl } from "../../utils/security";
import { TextField } from "../ui/TextField";

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
          if (!isDangerousUrl(e.target.value)) {
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
