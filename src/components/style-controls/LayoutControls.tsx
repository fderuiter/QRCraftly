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
import { CheckboxField, TextField } from '../ui/FormFields';
import { getContrastRatio } from '../../utils/colorUtils';
import { MIN_CONTRAST_THRESHOLD } from '../../constants';
import { ContrastBadge, ContrastBanner } from './ContrastWarning';

/**
 *
 */
interface LayoutControlsProps {
  /**
   *
   */
  config: QRConfig;
  /**
   *
   */
  onChange: (updates: Partial<QRConfig>) => void;
}

const FORMAT_OPTIONS: Array<{ id: SocialFormat; label: string; sublabel: string; icon: React.ReactNode }> = [
  {
    id: SocialFormat.SQUARE_1_1,
    label: 'Square',
    sublabel: '1:1',
    icon: <Square className="size-4" />,
  },
  {
    id: SocialFormat.PORTRAIT_4_5,
    label: 'Portrait',
    sublabel: '4:5',
    icon: (
      <svg viewBox="0 0 12 15" className="h-5 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="10" height="13" rx="1" />
      </svg>
    ),
  },
  {
    id: SocialFormat.STORY_9_16,
    label: 'Story',
    sublabel: '9:16',
    icon: <Smartphone className="h-5 w-4" />,
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
 * @param root0
 * @param root0.config
 * @param root0.onChange
 */
export const LayoutControls: React.FC<LayoutControlsProps> = ({ config, onChange }) => {
  const showTextInputs = config.templateStyle !== TemplateStyle.NONE;
  const showAdvanced = config.templateStyle !== TemplateStyle.NONE;

  // Whether custom (decoupled) background / text colors are active
  const hasBgOverride = config.templateBgColor !== undefined;
  const hasTextOverride = config.templateTextColor !== undefined;

  // Resolved colors & contrast
  const activeBg = config.templateBgColor ?? config.bgColor;
  const activeText = config.templateTextColor ?? config.fgColor;
  const contrastRatio = getContrastRatio(activeText, activeBg);
  const isLowContrast = showAdvanced && contrastRatio < MIN_CONTRAST_THRESHOLD;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Export Layout</h3>

      {/* Aspect Ratio Selector */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Aspect Ratio</p>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Aspect Ratio"
        >
          {FORMAT_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              variant={config.socialFormat === opt.id ? 'secondary' : 'outline'}
              onClick={() => onChange({ socialFormat: opt.id })}
              aria-pressed={config.socialFormat === opt.id}
              aria-label={`Select ${opt.label} format (${opt.sublabel})`}
              className={`h-auto flex-col rounded-lg border-2 px-1 py-2 ${config.socialFormat === opt.id ? 'border-teal-500' : 'border-transparent'}`}
            >
              {opt.icon}
              <span className="mt-1 text-[10px] leading-none font-semibold">{opt.label}</span>
              <span className="text-[10px] leading-none">{opt.sublabel}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Template Style Selector */}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Template</p>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Template Style"
        >
          {TEMPLATE_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              variant={config.templateStyle === opt.id ? 'secondary' : 'outline'}
              onClick={() => onChange({ templateStyle: opt.id })}
              aria-pressed={config.templateStyle === opt.id}
              aria-label={`Select ${opt.label} template`}
              className={`h-auto rounded-lg border-2 p-2 text-xs ${config.templateStyle === opt.id ? 'border-teal-500' : 'border-transparent'}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Text Inputs (visible only when a template is active) */}
      {showTextInputs && (
        <div className="animate-in fade-in slide-in-from-top-2 mt-4 space-y-2 duration-200">
          <TextField
            placeholder="Headline (e.g. Scan Me!)"
            value={config.templateHeadline ?? ''}
            onChange={(e) => onChange({ templateHeadline: e.target.value })}
            aria-label="Template headline"
          />
          <TextField
            placeholder="Subtext (e.g. @yourhandle)"
            value={config.templateSubtext ?? ''}
            onChange={(e) => onChange({ templateSubtext: e.target.value })}
            aria-label="Template subtext"
          />
        </div>
      )}

      {/* Advanced Template Settings (visible only when a template is active) */}
      {showAdvanced && (
        <div className="animate-in fade-in slide-in-from-top-2 mt-4 space-y-4 border-t border-slate-200 pt-4 duration-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Advanced Settings</p>

          {/* Template Background Color */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Template Background</span>
                <ContrastBadge isVisible={isLowContrast} contrastRatio={contrastRatio} decimalPrecision={1} data-testid="layout-bg-warning" />
              </div>
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
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Template Text Color</span>
                <ContrastBadge isVisible={isLowContrast} contrastRatio={contrastRatio} decimalPrecision={1} data-testid="layout-text-warning" />
              </div>
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

          {/* Amber Alert Card detailing the legibility risk when template contrast is insufficient */}
          <ContrastBanner
            isVisible={isLowContrast}
            contrastRatio={contrastRatio}
            messageType="layout"
            className="mt-4"
            decimalPrecision={2}
          />
        </div>
      )}
    </div>
  );
};
