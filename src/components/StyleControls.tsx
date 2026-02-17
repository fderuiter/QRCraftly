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


import React from 'react';
import { QRConfig } from '../types';
import { BorderControls } from './style-controls/BorderControls';
import { PatternControls } from './style-controls/PatternControls';
import { ColorControls } from './style-controls/ColorControls';
import { LogoControls } from './style-controls/LogoControls';
import { AdvancedControls } from './style-controls/AdvancedControls';

/**
 * Props for the StyleControls component.
 */
interface StyleControlsProps {
  /** The current QR code configuration. */
  config: QRConfig;
  /** Callback to update the configuration. */
  onChange: (updates: Partial<QRConfig>) => void;
}

/**
 * A component providing UI controls for styling the QR code.
 * Allows users to change patterns, colors, and upload logos.
 * Also checks and warns about low contrast ratios.
 *
 * @param props - The component props.
 * @param props.config - The current configuration.
 * @param props.onChange - Callback to update configuration.
 * @returns The StyleControls component.
 */
const StyleControls: React.FC<StyleControlsProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-8">
      {/* Border Controls */}
      <BorderControls config={config} onChange={onChange} />

      {/* Pattern Style */}
      <PatternControls config={config} onChange={onChange} />

      {/* Colors */}
      <ColorControls config={config} onChange={onChange} />

      {/* Logo */}
      <LogoControls config={config} onChange={onChange} />

      {/* Advanced Mode */}
      <AdvancedControls config={config} onChange={onChange} />
    </div>
  );
};

/**
 * Comparison function for React.memo.
 * Returns true if the next props are equivalent to the previous props (skipping re-render).
 * It ignores changes to 'value' and 'type' as they don't affect visual style controls.
 */
function arePropsEqual(prev: StyleControlsProps, next: StyleControlsProps) {
  // If the onChange handler changed, we must re-render
  if (prev.onChange !== next.onChange) return false;

  // Check referential equality first
  if (prev.config === next.config) return true;

  // Compare all config properties except 'value' and 'type'
  // We iterate over keys of next.config to ensure we catch any new properties
  const keys = Object.keys(next.config) as (keyof QRConfig)[];

  for (const key of keys) {
    // Skip content-related properties
    if (key === 'value' || key === 'type') continue;

    // If any style property differs, re-render
    if (prev.config[key] !== next.config[key]) {
      return false;
    }
  }

  return true;
}

export default React.memo(StyleControls, arePropsEqual);
