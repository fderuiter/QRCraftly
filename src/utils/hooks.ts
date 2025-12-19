import { useState, useEffect } from 'react';
import { QRConfig } from '../types';

/**
 * A hook that returns a debounced value.
 * The value will only update after the specified delay has passed without the value changing.
 *
 * @param value The value to debounce.
 * @param delay The delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timeout if the value changes (or the component unmounts)
    // This effectively resets the timer
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to manage input state for complex QR types (WiFi, Email, etc.).
 * Automatically updates the global QR config string when local input state changes.
 *
 * @param initialState - The initial state object for the input type.
 * @param constructorFn - Function to convert the state object to a QR code string.
 * @param onChange - The global config change handler.
 * @returns A tuple containing the current data and a function to update it.
 */
export function useQRInputState<T>(
  initialState: T,
  constructorFn: (data: T) => string,
  onChange: (updates: Partial<QRConfig>) => void
) {
  const [data, setData] = useState<T>(initialState);

  const update = (updates: Partial<T>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    onChange({ value: constructorFn(newData) });
  };

  return [data, update] as const;
}
