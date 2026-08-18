import React from "react";
import { UrlData } from "../../types";
import { TextField } from "../ui/FormFields";
import { normalizeUrl } from "../../utils/url";
import { isDangerousUrl } from "../../utils/security";

/**
 * Properties for the UrlInput component.
 */
interface UrlInputProps {
  /** The current URL configuration data. */
  data: UrlData;
  /** Callback to update the parent configuration. */
  onChange: (updates: Partial<UrlData>) => void;
}

/**
 * Website URL Input Component.
 * Handles static URL generation operating entirely in browser memory.
 * @param props - Component properties.
 * @param props.data - The URL data input state.
 * @param props.onChange - Handler called on URL configuration changes.
 * @returns The rendered UrlInput component.
 */
export const UrlInput: React.FC<UrlInputProps> = ({ data, onChange }) => {
  const urlError = data.url && isDangerousUrl(data.url)
    ? "Unsafe URL scheme or malicious protocol detected."
    : undefined;

  return (
    <div className="space-y-4">
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
