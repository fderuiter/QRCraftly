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
    <div className="mb-1 flex items-center justify-between">
      <label htmlFor={id} className="block text-xs font-medium text-fg-muted">
        {label}
      </label>
      <span className="font-mono text-xs text-fg-muted" aria-hidden="true">
        {formatValue(value)}
      </span>
    </div>
    <div className="-m-1 rounded-lg p-1">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={formatValue(value)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer rounded-lg accent-action"
      />
    </div>
  </div>
);
