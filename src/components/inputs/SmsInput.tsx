import React from 'react';
import { SmsData } from '../../types';
import { CharCount } from '../CharCount';
import { INPUT_CLASSES, TEXT_AREA_CLASSES } from './styles';

interface SmsInputProps {
  data: SmsData;
  onChange: (updates: Partial<SmsData>) => void;
}

export const SmsInput: React.FC<SmsInputProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-3">
        <div>
             <label htmlFor="sms-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
             <input
                id="sms-number"
                name="phone"
                autoComplete="tel"
                type="tel"
                maxLength={20}
                placeholder="+1 555 000 0000"
                value={data.number}
                onChange={(e) => onChange({ number: e.target.value })}
                className={INPUT_CLASSES}
             />
        </div>
        <div>
            <label htmlFor="sms-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pre-filled Message</label>
            <textarea
                id="sms-message"
                rows={3}
                maxLength={1600}
                value={data.message}
                onChange={(e) => onChange({ message: e.target.value })}
                className={TEXT_AREA_CLASSES}
            />
            <CharCount current={data.message.length} max={1600} />
        </div>
    </div>
  );
};
