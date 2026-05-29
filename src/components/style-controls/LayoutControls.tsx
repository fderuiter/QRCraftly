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
import { Button } from '../ui/Button';
import { Square, Smartphone } from 'lucide-react';
import { QRConfig, SocialFormat, TemplateStyle } from '../../types';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';
import { CheckboxField } from '../inputs/FormFields';

interface LayoutControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

const FORMAT_OPTIONS: Array<{
  id: SocialFormat;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}> = [
  {
    id: SocialFormat.SQUARE_1_1,
    label: 'Square',
    sublabel: '1:1',
    icon: <Square className="w-4 h-4" />,
  },
  {
    id: SocialFormat.PORTRAIT_4_5,
    label: 'Portrait',
    sublabel: '4:5',
    icon: (
      <svg
        viewBox="0 0 12 15"
        className="w-4 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="1" y="1" width="10" height="13" rx="1" />
      </svg>
    ),
  },
  {
    id: SocialFormat.STORY_9_16,
    label: 'Story',
    sublabel: '9:16',
    icon: <Smartphone className="w-4 h-5" />,
  },
];

const TEMPLATE_OPTIONS: Array<{ id: TemplateStyle; label: string }> = [
  { id: TemplateStyle.NONE, label: 'None' },
  { id: TemplateStyle.MINIMALIST, label: 'Minimalist' },
  { id: TemplateStyle.GRADIENT_BLUR, label: 'Gradient' },
  { id: TemplateStyle.SOLID_FRAME, label: 'Solid Frame' },
];

/**
 * Controls for choosing the social-media export aspect ratio and template
 * style applied to the QR code canvas.
 */
export const LayoutControls: React.FC<LayoutControlsProps> = ({ config, onChange }) => {
  const showTextInputs = config.templateStyle !== TemplateStyle.NONE;
  const showAdvanced = config.templateStyle !== TemplateStyle.NONE;

  // Whether custom (decoupled) background / text colors are active
  const hasBgOverride = config.templateBgColor !== undefined;
  const hasTextOverride = config.templateTextColor !== undefined;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
        Export Layout
      </h3>

      {/* Aspect Ratio Selector */}
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Aspect Ratio</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Aspect Ratio">
          {FORMAT_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              variant={config.socialFormat === opt.id ? 'secondary' : 'outline'}
              onClick={() => onChange({ socialFormat: opt.id })}
              aria-pressed={config.socialFormat === opt.id}
              aria-label={`Select ${opt.label} format (${opt.sublabel})`}
              className={`flex-col py-2 px-1 rounded-lg border-2 h-auto ${config.socialFormat === opt.id ? 'border-teal-500' : 'border-transparent'}`}
            >
              {opt.icon}
              <span className="text-[10px] font-semibold leading-none mt-1">{opt.label}</span>
              <span className="text-[10px] leading-none opacity-70">{opt.sublabel}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Template Style Selector */}
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Template</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Template Style">
          {TEMPLATE_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              variant={config.templateStyle === opt.id ? 'secondary' : 'outline'}
              onClick={() => onChange({ templateStyle: opt.id })}
              aria-pressed={config.templateStyle === opt.id}
              aria-label={`Select ${opt.label} template`}
              className={`py-2 px-2 rounded-lg border-2 text-xs h-auto ${config.templateStyle === opt.id ? 'border-teal-500' : 'border-transparent'}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Text Inputs (visible only when a template is active) */}
      {showTextInputs && (
        <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            placeholder="Headline (e.g. Scan Me!)"
            value={config.templateHeadline ?? ''}
            onChange={(e) => onChange({ templateHeadline: e.target.value })}
            aria-label="Template headline"
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
          />
          <input
            type="text"
            placeholder="Subtext (e.g. @yourhandle)"
            value={config.templateSubtext ?? ''}
            onChange={(e) => onChange({ templateSubtext: e.target.value })}
            aria-label="Template subtext"
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      )}

      {/* Advanced Template Settings (visible only when a template is active) */}
      {showAdvanced && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Advanced Settings
          </p>

          {/* Template Background Color */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Template Background
              </span>
              <CheckboxField
                id="override-bg-color"
                checked={hasBgOverride}
                onChange={(e) =>
                  onChange({
                    templateBgColor: e.target.checked ? config.bgColor : undefined,
                  })
                }
                aria-label="Override template background color"
                label={hasBgOverride ? 'Custom' : 'Inherit'}
                labelClassName="text-[10px] text-slate-500 dark:text-slate-400"
              />
            </div>
            {hasBgOverride && (
              <ColorInput
                id="templateBgColor"
                label=""
                value={config.templateBgColor!}
                onChange={(val) => onChange({ templateBgColor: val })}
              />
            )}
          </div>

          {/* Template Text / Accent Color */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Template Text Color
              </span>
              <CheckboxField
                id="override-text-color"
                checked={hasTextOverride}
                onChange={(e) =>
                  onChange({
                    templateTextColor: e.target.checked ? config.fgColor : undefined,
                  })
                }
                aria-label="Override template text color"
                label={hasTextOverride ? 'Custom' : 'Inherit'}
                labelClassName="text-[10px] text-slate-500 dark:text-slate-400"
              />
            </div>
            {hasTextOverride && (
              <ColorInput
                id="templateTextColor"
                label=""
                value={config.templateTextColor!}
                onChange={(val) => onChange({ templateTextColor: val })}
              />
            )}
          </div>

          {/* QR Scale */}
          <RangeInput
            id="templateQrScale"
            label="QR Scale"
            value={config.templateQrScale ?? 1.0}
            onChange={(val) => onChange({ templateQrScale: val })}
            min={0.5}
            max={1.5}
            step={0.05}
            formatValue={(val) => `${Math.round(val * 100)}%`}
          />
        </div>
      )}
    </div>
  );
};
