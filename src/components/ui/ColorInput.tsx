import React, { useState, useRef, useEffect } from 'react';

/**
 * Helper component for color inputs to reduce duplication.
 */
interface ColorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  displayValue?: string;
  sizeClass?: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({
  id,
  label,
  value,
  onChange,
  displayValue,
  sizeClass = "w-10 h-10"
}) => {
  const [textValue, setTextValue] = useState(displayValue || value);
  const textValueRef = useRef(textValue);

  // Keep ref updated with latest textValue for use in useEffect
  useEffect(() => {
    textValueRef.current = textValue;
  }, [textValue]);

  // Sync textValue when prop value changes, but avoid overwriting user input while typing
  useEffect(() => {
    const normalize = (val: string) => {
      const match = val.match(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
      if (!match) return null;
      let hex = match[1];
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      return '#' + hex.toLowerCase();
    };

    const currentText = textValueRef.current;
    const currentNormalized = normalize(currentText);
    const propNormalized = normalize(displayValue || value);

    // Only update textValue if the prop value is different from what we currently have
    // (after normalization). This prevents overwriting shorthand inputs (e.g. "#123")
    // with the expanded version ("#112233") while the user is typing.
    if (currentNormalized !== propNormalized) {
      setTextValue(displayValue || value);
    }
  }, [value, displayValue]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setTextValue(newVal);

    // Validate and trigger change if valid hex
    const hexMatch = newVal.match(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      onChange('#' + hex);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${sizeClass} rounded cursor-pointer border-0 p-0 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900`}
          />
          <input
            type="text"
            value={textValue}
            onChange={handleTextChange}
            className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-transparent border border-transparent hover:border-slate-300 focus:border-teal-500 rounded px-1 py-0.5 w-24 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900"
            aria-label={`${label} Hex Code`}
          />
      </div>
    </div>
  );
};
