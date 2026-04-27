import React from "react";
import { TextData } from "../../types";
import { TextAreaField } from "./FormFields";

interface TextInputProps {
  data: TextData;
  onChange: (updates: Partial<TextData>) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ data, onChange }) => {
  return (
    <div>
      <TextAreaField
        id="text-content"
        label="Content"
        rows={4}
        maxLength={2500}
        placeholder="Enter your text here..."
        value={data.text}
        onChange={(e) => onChange({ text: e.target.value })}
        showCharCount
      />
    </div>
  );
};
