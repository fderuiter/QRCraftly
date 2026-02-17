import React from 'react';
import { EmailData } from '../../types';
import { CharCount } from '../CharCount';
import { INPUT_CLASSES, TEXT_AREA_CLASSES } from './styles';

interface EmailInputProps {
  data: EmailData;
  onChange: (updates: Partial<EmailData>) => void;
}

export const EmailInput: React.FC<EmailInputProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-3">
        <div>
            <label htmlFor="email-address" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
            <input
                id="email-address"
                name="email"
                autoComplete="email"
                type="email"
                maxLength={254}
                value={data.email}
                onChange={(e) => onChange({ email: e.target.value })}
                className={INPUT_CLASSES}
            />
        </div>
        <div>
            <label htmlFor="email-subject" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subject</label>
            <input
                id="email-subject"
                type="text"
                maxLength={200}
                value={data.subject}
                onChange={(e) => onChange({ subject: e.target.value })}
                className={INPUT_CLASSES}
            />
        </div>
        <div>
            <label htmlFor="email-body" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Body</label>
            <textarea
                id="email-body"
                rows={3}
                maxLength={2000}
                value={data.body}
                onChange={(e) => onChange({ body: e.target.value })}
                className={TEXT_AREA_CLASSES}
            />
            <CharCount current={data.body.length} max={2000} />
        </div>
    </div>
  );
};
