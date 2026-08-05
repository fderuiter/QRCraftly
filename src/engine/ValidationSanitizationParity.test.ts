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

import { describe, it, expect } from 'vitest';
import { ValidationEngine } from './ValidationEngine';
import { QRConfig, QRType, QRErrorCorrectionLevel, SocialFormat, TemplateStyle, QRStyle } from '../types';
import '../utils/qrHelpers';

const getBaseConfig = (type: QRType, value: string): QRConfig => ({
  type,
  value,
  fgColor: '#000000',
  bgColor: '#FFFFFF',
  eyeColor: '#000000',
  errorCorrectionLevel: QRErrorCorrectionLevel.M,
  logoUrl: '',
  logoSize: 0.2,
  logoPadding: 0,
  logoPaddingStyle: 'square',
  logoBackgroundColor: '#FFFFFF',
  style: QRStyle.STANDARD,
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
  isBorderEnabled: false,
  borderSize: 0.05,
  borderStyle: 'solid',
  borderColor: '#000000',
  borderText: '',
  borderTextColor: '#000000',
  borderLogoUrl: null,
  borderTextPosition: 'bottom-center',
  borderLogoPosition: 'bottom-center',
});

describe('Validation-Sanitization Parity', () => {
  it('should ensure any sanitized input passes validation (no zero-width or control characters blocking layout)', () => {
    const dirtyInputs = [
      'Hello\u200BWorld',
      'Foo\uFEFFBar',
      'Test\u200CSpace',
      'Control\x07Character',
      'Zero\u200DWidth\x00Joiner',
      'Multiple\u200B\u200C\u200D\uFEFFInvisibles',
    ];

    for (const input of dirtyInputs) {
      // 1. Plain text sanitization parity
      const sanitizedText = ValidationEngine.sanitizeInput(input);
      const configText = getBaseConfig(QRType.TEXT, sanitizedText);
      const violationsText = ValidationEngine.validateConfig(configText);
      expect(violationsText).not.toContain('Payload contains invalid control or zero-width characters');
      expect(violationsText).toHaveLength(0);

      // 2. Full config sanitization parity
      const rawConfig = getBaseConfig(QRType.TEXT, input);
      const sanitizedConfig = ValidationEngine.sanitizeConfig(rawConfig);
      const violationsConfig = ValidationEngine.validateConfig(sanitizedConfig);
      expect(violationsConfig).not.toContain('Payload contains invalid control or zero-width characters');
    }
  });

  it('should preserve multi-line and tab formatting in VCARD and EVENT payloads without triggering validation failures', () => {
    const dirtyVcard = 'BEGIN:VCARD\nVERSION:3.0\nN:Doe;John;;;\nFN:John \u200BDoe\nORG:Example\tInc.\nEND:VCARD';
    
    // Sanitize the structured config
    const rawConfig = getBaseConfig(QRType.VCARD, dirtyVcard);
    const sanitizedConfig = ValidationEngine.sanitizeConfig(rawConfig);
    
    // Assert formatting is preserved (newlines and tabs are kept)
    expect(sanitizedConfig.value).toContain('\n');
    expect(sanitizedConfig.value).toContain('\t');
    
    // Assert zero-width spaces are stripped
    expect(sanitizedConfig.value).not.toContain('\u200B');

    // Run validation on the sanitized config
    const violations = ValidationEngine.validateConfig(sanitizedConfig);
    expect(violations).not.toContain('Payload contains invalid control or zero-width characters');
    // Ensure the structure is valid enough not to fail other checks
    expect(violations).toHaveLength(0);
  });

  it('should cleanly strip carriage returns, newlines, and tabs from standard non-structured payloads', () => {
    const dirtyUrl = 'https://example.com/some\npath\twith\rcontrol';
    
    const rawConfig = getBaseConfig(QRType.URL, dirtyUrl);
    const sanitizedConfig = ValidationEngine.sanitizeConfig(rawConfig);

    expect(sanitizedConfig.value).not.toContain('\n');
    expect(sanitizedConfig.value).not.toContain('\t');
    expect(sanitizedConfig.value).not.toContain('\r');

    const violations = ValidationEngine.validateConfig(sanitizedConfig);
    expect(violations).not.toContain('Payload contains invalid control or zero-width characters');
  });

  it('should ensure sinks (border text, templates) are strictly stripped of newlines and tabs, and pass validation', () => {
    const dirtySinkText = 'Line1\nLine2\tTabbed\u200BInvisible';
    
    const rawConfig = getBaseConfig(QRType.TEXT, 'Safe Value');
    rawConfig.borderText = dirtySinkText;
    rawConfig.templateHeadline = dirtySinkText;
    rawConfig.templateSubtext = dirtySinkText;

    const sanitizedConfig = ValidationEngine.sanitizeConfig(rawConfig);

    // Verify all sinks stripped of strictly restricted characters (newlines, tabs, invisibles)
    for (const text of [sanitizedConfig.borderText, sanitizedConfig.templateHeadline, sanitizedConfig.templateSubtext]) {
      expect(text).not.toContain('\n');
      expect(text).not.toContain('\t');
      expect(text).not.toContain('\u200B');
    }

    const violations = ValidationEngine.validateConfig(sanitizedConfig);
    expect(violations).toHaveLength(0);
  });
});
