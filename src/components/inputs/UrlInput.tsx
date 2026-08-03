import React from "react";
import { UrlData } from "../../types";
import { TextField } from "../ui/FormFields";

/**
 *
 */
interface UrlInputProps {
  /**
   *
   */
  data: UrlData;
  /**
   *
   */
  onChange: (updates: Partial<UrlData>) => void;
}

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.onChange
 */
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
