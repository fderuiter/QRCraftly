import { describe, it, expect } from 'vitest';
import { ValidationEngine } from './ValidationEngine';
import { QRConfig, QRType, ErrorCorrectionLevel, SocialFormat, TemplateStyle } from '../types';

const getBaseConfig = (): QRConfig => ({
  type: QRType.TEXT,
  value: 'hello world',
  fgColor: '#000000',
  bgColor: '#FFFFFF',
  eyeColor: '#000000',
  errorCorrectionLevel: 'M',
  logoUrl: '',
  logoSize: 0.2,
  logoPadding: 0,
  logoStyle: 'square',
  style: 'standard',
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
  isBorderEnabled: false,
  borderStyle: 'solid',
  borderColor: '#000000',
  borderTextColor: '#000000',
  borderTextPosition: 'bottom',
  borderLogoPosition: 'bottom',
});

describe('ValidationEngine', () => {
  describe('validateConfig', () => {
    it('should pass valid configurations', () => {
      const config = getBaseConfig();
      const violations = ValidationEngine.validateConfig(config);
      expect(violations).toHaveLength(0);
    });

    it('should reject zero-width characters in border text', () => {
      const config = getBaseConfig();
      config.borderText = 'Hello\u200BWorld'; // Zero-width space
      const violations = ValidationEngine.validateConfig(config);
      expect(violations).toContain('Border Text contains invalid control or zero-width characters');
    });

    it('should reject zero-width characters in template headline', () => {
      const config = getBaseConfig();
      config.templateHeadline = 'Hello\uFEFFWorld'; // Byte order mark
      const violations = ValidationEngine.validateConfig(config);
      expect(violations).toContain('Template Headline contains invalid control or zero-width characters');
    });

    it('should reject dangerous URLs', () => {
      const config = getBaseConfig();
      config.type = QRType.URL;
      config.value = 'javascript:alert(1)';
      const violations = ValidationEngine.validateConfig(config);
      expect(violations).toContain('URI_INJECTION_VIOLATION');
    });

    it('should reject malformed URLs violating the containment profile', () => {
      const config = getBaseConfig();
      config.type = QRType.URL;
      config.value = 'http://safe.com/ \x00'; // Contains null character
      const violations = ValidationEngine.validateConfig(config);
      // It should either fail control char check or URL structure check
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should reject malformed emails violating the containment profile', () => {
      const config = getBaseConfig();
      config.type = QRType.EMAIL;
      config.value = 'mailto:invalid@@email..com';
      const violations = ValidationEngine.validateConfig(config);
      expect(violations).toContain('EMAIL_STRUCTURE_VIOLATION');
    });
  });
});
