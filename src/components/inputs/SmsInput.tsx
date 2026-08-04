import React from "react";
import { SmsData } from "../../types";
import { TextField, TextAreaField } from "../ui/FormFields";
import { CONTAINER_SPACING_CLASSES } from "../ui/styles";

/**
 *
 */
interface SmsInputProps {
  /**
   *
   */
  data: SmsData;
  /**
   *
   */
  onChange: (updates: Partial<SmsData>) => void;
}

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.onChange
 */
export const SmsInput: React.FC<SmsInputProps> = ({ data, onChange }) => {
  return (
    <div className={CONTAINER_SPACING_CLASSES}>
      <TextField
        id="sms-number"
        name="phone"
        label="Phone Number"
        autoComplete="tel"
        type="tel"
        maxLength={500}
        placeholder="+1 555 000 0000"
        value={data.number}
        onChange={(e) => onChange({ number: e.target.value })}
      />
      <TextAreaField
        id="sms-message"
        label="Pre-filled Message"
        rows={3}
        maxLength={1600}
        placeholder="Type your SMS message here..."
        value={data.message}
        onChange={(e) => onChange({ message: e.target.value })}
        showCharCount
      />
    </div>
  );
};
