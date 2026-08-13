import React from "react";
import { UrlData } from "../../types";
import { TextField } from "../ui/FormFields";
import { normalizeUrl } from "../../utils/url";
import { isDangerousUrl } from "../../utils/security";

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
 * Website URL Input Component.
 * @param root0 - Destructured props object.
 * @param root0.data - Current URL configuration data.
 * @param root0.onChange - Handler called on state change.
 * @returns React functional component rendering website URL inputs.
 */
export const UrlInput: React.FC<UrlInputProps> = ({ data, onChange }) => {
  const urlError = data.url && isDangerousUrl(data.url)
    ? "Unsafe URL scheme or malicious protocol detected."
    : undefined;

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
        onBlur={() => {
          if (data.url) {
            onChange({ url: normalizeUrl(data.url) });
          }
        }}
        error={urlError}
      />
    </div>
  );
};
