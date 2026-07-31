import React, { useState, useRef, useEffect } from 'react';
import { normalizeHex } from '../../utils/colorUtils';

/**
 * Helper component for color inputs to reduce duplication.
 */
interface ColorInputProps {
  /**
   *
   */
  id: string;
  /**
   *
   */
  label?: string;
  /**
   *
   */
  value: string;
  /**
   *
   */
  onChange: (value: string) => void;
  /**
   *
   */
  displayValue?: string;
  /**
   *
   */
  sizeClass?: string;
  /**
   *
   */
  title?: string;
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.displayValue
 * @param root0.sizeClass
 * @param root0.title
 */
export const ColorInput: React.FC<ColorInputProps> = ({
  id,
  label,
  value,
  onChange,
  displayValue,
  sizeClass = "w-10 h-10",
  title
}) => {
  const [textValue, setTextValue] = useState(displayValue || value);
  const textValueRef = useRef(textValue);

  // Keep ref updated with latest textValue for use in useEffect
  useEffect(() => {
    textValueRef.current = textValue;
  }, [textValue]);

  // Sync textValue when prop value changes, but avoid overwriting user input while typing
  useEffect(() => {
    const currentText = textValueRef.current;
    const currentNormalized = normalizeHex(currentText);
    const propNormalized = normalizeHex(displayValue || value);

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
    const normalized = normalizeHex(newVal);
    if (normalized) {
      onChange(normalized);
    }
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block dark:text-slate-400 font-medium mb-1 text-slate-500 text-xs">
          {label}
        </label>
      )}
      <div className="-m-1 flex gap-2 items-center p-1 rounded-lg">
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${sizeClass} bg-transparent border-0 cursor-pointer p-0 rounded`}
            title={title}
          />
          <input
            type="text"
            value={textValue}
            onChange={handleTextChange}
            className="bg-transparent border border-transparent dark:text-slate-300 font-mono hover:border-slate-300 px-1 py-0.5 rounded text-slate-600 text-xs transition-colors w-24"
            aria-label={`${label} Hex Code`}
          />
      </div>
    </div>
  );
};
