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
import { QRConfig, QRType } from '../types';
import { TypeSelector, useInputLogic } from './inputs';
import { useDynamicFocus } from '../hooks/useDynamicFocus';
import { Button } from './ui/Button';
import { Camera } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { useToast } from './ui/Toast';
import { INPUT_REGISTRY } from './inputs/InputRegistry';

/**
 * Props for the InputPanel component.
 */
interface InputPanelProps {
  /** The content slice of the QR configuration (the panel reads only type and value). */
  config: Pick<QRConfig, 'type' | 'value'>;
  /** Callback to update the configuration. */
  onChange: (updates: Partial<QRConfig>) => void;
}

/** Human-readable names for QR types, used in announcements and toasts (never raw enum values). */
const QR_TYPE_LABELS: Record<QRType, string> = {
  [QRType.URL]: 'URL',
  [QRType.TEXT]: 'Text',
  [QRType.WIFI]: 'WiFi',
  [QRType.EVENT]: 'Event',
  [QRType.EMAIL]: 'Email',
  [QRType.VCARD]: 'vCard contact',
  [QRType.PHONE]: 'Phone',
  [QRType.SMS]: 'SMS',
  [QRType.PAYMENT]: 'Payment',
  [QRType.LOCATION]: 'Location',
  [QRType.MEETING]: 'Meeting',
  [QRType.SOCIAL]: 'Social',
};

/**
 * Returns the human-readable label for a QR type.
 * @param type - The QR type.
 * @returns The display label, falling back to the raw value for unknown types.
 */
export function getQRTypeLabel(type: QRType): string {
  // eslint-disable-next-line security/detect-object-injection -- keyed by the QRType enum
  return QR_TYPE_LABELS[type] ?? type;
}

/**
 * A component that provides input fields for different QR code types.
 * Allows users to enter data for URL, Text, WiFi, Email, vCard, Phone, and SMS.
 * It updates the main configuration with the formatted string for the QR code.
 * @param props - The component props.
 * @param props.config - The current QR code configuration state.
 * @param props.onChange - Callback function to update the configuration.
 * @returns The InputPanel component.
 */
const InputPanel: React.FC<InputPanelProps> = ({ config, onChange }) => {
  const { InputComponent, inputProps, flush } = useInputLogic(config, onChange);
  const containerRef = useDynamicFocus<HTMLDivElement>([config.type]);
  const [announcement, setAnnouncement] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const { addToast } = useToast();

  // Update live region announcement when type changes
  useEffect(() => {
    // Only announce when type is explicitly changed, don't re-announce on simple re-renders
    setAnnouncement(`${getQRTypeLabel(config.type)} input loaded`);
  }, [config.type]);

  const handleScanSuccess = (decodedData: string) => {
    setScannerActive(false);

    // Auto-detect the correct QRType based on registry hydrate matchers
    let detectedType = QRType.TEXT;
    for (const key of Object.keys(INPUT_REGISTRY) as QRType[]) {
      // eslint-disable-next-line security/detect-object-injection
      const entry = INPUT_REGISTRY[key];
      if (entry && entry.canHydrateFn && entry.canHydrateFn(decodedData)) {
        detectedType = key;
        break;
      }
    }

    onChange({
      type: detectedType,
      value: decodedData,
    });

    addToast({
      type: 'success',
      message: `Successfully scanned QR code! Type detected: ${getQRTypeLabel(detectedType)}`,
      duration: 5000,
    });
  };

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
      <TypeSelector currentType={config.type} />

      {/* Inputs or Scanner Container */}
      <div
        id="qr-content-input"
        className="space-y-4"
        ref={containerRef}
        // Commit a pending debounced edit as soon as focus leaves the inputs, so a button
        // pressed right after typing acts on what was typed.
        onBlur={flush}
      >
        {scannerActive ? (
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setScannerActive(false)}
          />
        ) : (
          InputComponent && (
            <InputComponent {...inputProps} />
          )
        )}
      </div>

      {/* Scanner Control Button */}
      {!scannerActive && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScannerActive(true)}
            className="flex items-center gap-2"
          >
            <Camera className="size-4" />
            Scan QR Code
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Comparison function for React.memo.
 * Returns true if the next props are equivalent to the previous props (skipping re-render).
 * It ignores changes to 'fgColor', 'bgColor', 'style', etc. as they don't affect the input panel.
 * @param prev - Previous props of the input panel.
 * @param next - Next props of the input panel.
 * @returns True if previous and next props are equivalent.
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
