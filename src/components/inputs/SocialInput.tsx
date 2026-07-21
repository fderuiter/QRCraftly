import React from "react";
import { SocialData, SocialPlatform } from "../../types";
import { TextField, SelectField } from "../ui/FormFields";

interface SocialInputProps {
  data: SocialData;
  onChange: (updates: Partial<SocialData>) => void;
}

export const SocialInput: React.FC<SocialInputProps> = ({ data, onChange }) => {
  return (
    <fieldset className="space-y-4 min-w-0">
      <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-full mb-3">
        Social Media Profile
      </legend>
      <SelectField
        id="social-platform"
        label="Platform"
        value={data.platform}
        onChange={(e) =>
          onChange({ platform: e.target.value as SocialPlatform })
        }
      >
        <option value={SocialPlatform.INSTAGRAM}>Instagram</option>
        <option value={SocialPlatform.TWITTER}>Twitter / X</option>
        <option value={SocialPlatform.TIKTOK}>TikTok</option>
      </SelectField>
      <TextField
        id="social-handle"
        label="Username / Handle"
        type="text"
        placeholder="@username"
        maxLength={64}
        value={data.handle}
        onChange={(e) => onChange({ handle: e.target.value })}
        showCharCount
      />
    </fieldset>
  );
};
