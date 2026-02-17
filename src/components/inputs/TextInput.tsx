import React from 'react';
import { CharCount } from '../CharCount';
import { TEXT_AREA_CLASSES } from './styles';

interface TextInputProps {
  data: string;
  onChange: (value: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ data, onChange }) => {
  return (
    <div>
      <label htmlFor="text-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
      <textarea
        id="text-content"
        rows={4}
        maxLength={2500}
        placeholder="Enter your text here..."
        className={TEXT_AREA_CLASSES}
        value={data}
        onChange={(e) => onChange(e.target.value)}
      />
      <CharCount current={data.length} max={2500} />
    </div>
  );
};
