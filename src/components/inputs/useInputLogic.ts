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

import { useState, useRef, useEffect, ElementType } from 'react';
import { QRConfig, QRType } from '../../types';
import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';
import { INPUT_REGISTRY } from './InputRegistry';

/**
 * Hook to encapsulate the state management and component selection logic for the InputPanel.
 * It maintains the state for each input type so that data is preserved when switching types.
 *
 * @param config - The current QR configuration.
 * @param onChange - Callback to update the configuration.
 * @returns An object containing the component to render and its props.
 */
export function useInputLogic(config: QRConfig, onChange: (updates: Partial<QRConfig>) => void): { InputComponent: ElementType | null, inputProps: any } {
  // Initialize state for all complex types from registry
  const [inputStates, setInputStates] = useState<Record<string, any>>(() => {
    const states: Record<string, any> = {};
    Object.keys(INPUT_REGISTRY).forEach(key => {
      states[key] = INPUT_REGISTRY[key].initialState;
    });
    return states;
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout if type changes to prevent race conditions (simulating unmount of previous input)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [config.type]);

  // Generic handler for all complex inputs
  const handleInputChange = (type: string, updates: any) => {
    const currentData = inputStates[type];
    const newData = { ...currentData, ...updates };

    setInputStates(prev => ({
      ...prev,
      [type]: newData
    }));

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const entry = INPUT_REGISTRY[type];
      if (entry) {
        onChange({ value: entry.constructFn(newData) });
      }
    }, 100);
  };

  // Handle simple types (URL, Text) separately as they map directly to config.value
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

  // Handle complex types via registry
  const registryEntry = INPUT_REGISTRY[config.type];
  if (registryEntry) {
    return {
      InputComponent: registryEntry.Component,
      inputProps: {
        data: inputStates[config.type],
        onChange: (updates: any) => handleInputChange(config.type, updates)
      }
    };
  }

  return {
    InputComponent: null,
    inputProps: {}
  };
}
