import React from 'react';
import { EmailData } from '../../types';
import { TextField, TextAreaField } from './FormFields';

interface EmailInputProps {
  data: EmailData;
  onChange: (updates: Partial<EmailData>) => void;
}

export const EmailInput: React.FC<EmailInputProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-3">
        <TextField
            id="email-address"
            name="email"
            label="Email Address"
            autoComplete="email"
            type="email"
            maxLength={254}
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            fieldSize="xs"
        />
        <TextField
            id="email-subject"
            label="Subject"
            type="text"
            maxLength={200}
            value={data.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            fieldSize="xs"
            showCharCount
        />
        <TextAreaField
            id="email-body"
            label="Body"
            rows={3}
            maxLength={2000}
            value={data.body}
            onChange={(e) => onChange({ body: e.target.value })}
            fieldSize="xs"
            showCharCount
        />
    </div>
  );
};
