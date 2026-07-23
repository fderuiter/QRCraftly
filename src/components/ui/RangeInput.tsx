import React from 'react';

/**
 * Helper component for range inputs to display current value.
 */
interface RangeInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue?: (value: number) => string;
}

export const RangeInput: React.FC<RangeInputProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue = (val) => val.toString(),
}) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
        {formatValue(value)}
      </span>
    </div>
    <div className="rounded-lg transition-all focus-within:ring-2 focus-within:ring-rose-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900 focus-within:outline-none p-1 -m-1">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={formatValue(value)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-teal-700 dark:accent-teal-500 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
      />
    </div>
  </div>
);
