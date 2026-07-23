import React from "react";
import { UrlData } from "../../types";
import { TextField } from "../ui/FormFields";

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
          onChange({ url: e.target.value });
        }}
      />
    </div>
  );
};
