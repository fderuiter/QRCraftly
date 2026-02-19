/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { ElementType } from 'react';
import { useState, useRef, useEffect } from 'react';
import { QRConfig, QRType } from '../../types';
import { INPUT_REGISTRY } from './InputRegistry';
import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';

/**
 * Hook to encapsulate the state management and component selection logic for the InputPanel.
 * It uses a registry pattern to handle complex input types and maintains their state.
 *
 * @param config - The current QR configuration.
 * @param onChange - Callback to update the configuration.
 * @returns An object containing the component to render and its props.
 */
export function useInputLogic(config: QRConfig, onChange: (updates: Partial<QRConfig>) => void): { InputComponent: ElementType | null, inputProps: any } {
  // Initialize state map with initial values from registry
  const [inputStates, setInputStates] = useState<Record<string, any>>(() => {
    const initialState: Record<string, any> = {};
    (Object.keys(INPUT_REGISTRY) as QRType[]).forEach((type) => {
        const entry = INPUT_REGISTRY[type];
        if (entry) {
            initialState[type] = entry.initialState;
        }
    });
    return initialState;
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount or type change to prevent race conditions
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [config.type]);

  /**
   * Updates the local state for a specific input type and debounces the global config update.
   */
  const handleInputChange = (type: QRType, updates: any) => {
    // Calculate new data based on current state
    // We use the current state from the closure, which is sufficient for user input events
    const currentData = inputStates[type];
    const newData = { ...currentData, ...updates };

    // Update React State
    setInputStates((prev) => ({ ...prev, [type]: newData }));

    // Handle Side Effect (Debounce global update)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
        const entry = INPUT_REGISTRY[type];
        if (entry) {
            onChange({ value: entry.construct(newData) });
        }
    }, 100);
  };

  // Direct handling for simple types (URL, TEXT) that map directly to config.value
  if (config.type === QRType.URL) {
      return {
          InputComponent: UrlInput,
          inputProps: {
              value: config.value,
              onChange: (val: string) => onChange({ value: val })
          }
      };
  }

  if (config.type === QRType.TEXT) {
      return {
          InputComponent: TextInput,
          inputProps: {
              value: config.value,
              onChange: (val: string) => onChange({ value: val })
          }
      };
  }

  // Registry handling for complex types (WIFI, EMAIL, etc.)
  const entry = INPUT_REGISTRY[config.type];
  if (entry) {
      return {
          InputComponent: entry.Component,
          inputProps: {
              // Fallback to initial state if key is missing (shouldn't happen if initialized correctly)
              data: inputStates[config.type] || entry.initialState,
              onChange: (updates: any) => handleInputChange(config.type, updates)
          }
      };
  }

  return {
    InputComponent: null,
    inputProps: {}
  };
}
