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

import React, { useState, useEffect } from 'react';

import { QRConfig } from '../types';
import { useDynamicFocus } from '../hooks/useDynamicFocus';

import { TypeSelector, useInputLogic } from './inputs';

/**
 * Props for the InputPanel component.
 */
interface InputPanelProps {
  /** The current QR code configuration. */
  config: QRConfig;
  /** Callback to update the configuration. */
  onChange: (updates: Partial<QRConfig>) => void;
}

/**
 * A component that provides input fields for different QR code types.
 * Allows users to enter data for URL, Text, WiFi, Email, vCard, Phone, and SMS.
 * It updates the main configuration with the formatted string for the QR code.
 *
 * @param props - The component props.
 * @param props.config - The current QR code configuration state.
 * @param props.onChange - Callback function to update the configuration.
 * @returns The InputPanel component.
 */
const InputPanel: React.FC<InputPanelProps> = ({ config, onChange }) => {
  const { InputComponent, inputProps } = useInputLogic(config, onChange);
  const containerRef = useDynamicFocus<HTMLDivElement>([config.type]);
  const [announcement, setAnnouncement] = useState('');

  // Update live region announcement when type changes
  useEffect(() => {
    // Only announce when type is explicitly changed, don't re-announce on simple re-renders
    const typeNames: Record<string, string> = {
      URL: 'URL',
      TEXT: 'Text',
      WIFI: 'WiFi',
      EVENT: 'Event',
      EMAIL: 'Email',
      VCARD: 'Contact',
      PHONE: 'Phone',
      SMS: 'SMS',
      PAYMENT: 'Payment',
      LOCATION: 'Location',
      MEETING: 'Meeting',
      SOCIAL: 'Social'
    };
    
    setAnnouncement(`${typeNames[config.type] || config.type} input loaded`);
  }, [config.type]);

  return (
    <div className="space-y-6">
      {/* Live Region for Screen Readers */}
      <div 
        aria-live="polite" 
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      {/* Type Selector */}
      <TypeSelector
        currentType={config.type}
        onSelect={(type) => onChange({ type, value: '' })}
      />

      {/* Inputs */}
      <div className="space-y-4" ref={containerRef}>
        {InputComponent && (
          <InputComponent {...inputProps} />
        )}
      </div>
    </div>
  );
};

/**
 * Comparison function for React.memo.
 * Returns true if the next props are equivalent to the previous props (skipping re-render).
 * It ignores changes to 'fgColor', 'bgColor', 'style', etc. as they don't affect the input panel.
 */
function areInputPropsEqual(prev: InputPanelProps, next: InputPanelProps) {
  // If the onChange handler changed, we must re-render
  if (prev.onChange !== next.onChange) return false;

  // We only care about config.type and config.value for the input panel.
  // Style changes (colors, etc.) should NOT trigger a re-render of inputs.
  return prev.config.type === next.config.type &&
         prev.config.value === next.config.value;
}

export default React.memo(InputPanel, areInputPropsEqual);
