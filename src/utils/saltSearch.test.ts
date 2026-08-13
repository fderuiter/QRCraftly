import { describe, it, expect, vi } from 'vitest';
import { performSaltSearch } from './saltSearch';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '../types';

describe('performSaltSearch', () => {
  const createConfig = (url = 'https://example.com'): QRConfig => ({
    value: url,
    type: QRType.URL,
    fgColor: '#000000',
    bgColor: '#ffffff',
    style: QRStyle.MAZE,
    logoUrl: null,
    logoSize: 0.15,
    logoPaddingStyle: 'none',
    logoPadding: 0,
    logoBackgroundColor: '#ffffff',
    eyeColor: '#000000',
    errorCorrectionLevel: QRErrorCorrectionLevel.H,
    isBorderEnabled: false,
    borderSize: 0,
    borderColor: '#000000',
    borderStyle: 'solid',
    borderText: '',
    borderTextPosition: 'top-center',
    borderTextColor: '#000000',
    borderLogoUrl: null,
    borderLogoPosition: 'bottom-center',
    socialFormat: SocialFormat.SQUARE_1_1,
    templateStyle: TemplateStyle.NONE,
  });

  it('runs salt search and yields a result within timeout', async () => {
    const config = createConfig();
    const result = await performSaltSearch(config, undefined, undefined, 500);

    expect(result).toBeDefined();
    expect(result.config).toBeDefined();
    expect(result.modules).toBeDefined();
    expect(result.modules.size).toBeGreaterThan(0);
    // Even if no solvable maze was found, it must gracefully return the default unsalted result
    if (result.salt === null) {
      expect(result.config.value).toBe(config.value);
    } else {
      expect(result.config.value).toContain('salt=');
    }
  });

  it('stops search and returns default when timeout is exceeded', async () => {
    const config = createConfig();
    // Use an extremely small timeout like 1ms to guarantee a timeout fallback
    const result = await performSaltSearch(config, undefined, undefined, 1);

    expect(result.salt).toBeNull();
    expect(result.config.value).toBe(config.value);
  });

  it('allows premature cancellation', async () => {
    const config = createConfig();
    const shouldCancel = vi.fn().mockReturnValue(true);

    await expect(performSaltSearch(config, undefined, undefined, 2000, shouldCancel))
      .rejects.toThrow('CANCELLED');
  });
});
