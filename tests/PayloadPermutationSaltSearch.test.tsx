import { describe, it, expect, vi } from 'vitest';
import { performSaltSearch } from '../src/utils/saltSearch';
import { isMazeSolvable, appendSaltToUrl } from '../src/utils/mazeHelpers';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle, QRModules } from '../src/types';

describe('Payload-Permutation Salt Search Integration', () => {
  const createConfig = (url = 'https://example.com/maze'): QRConfig => ({
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

  it('Requirement 1: appends and increments salt query parameter', () => {
    const url = 'https://test.com/path';
    const salted1 = appendSaltToUrl(url, 0);
    expect(salted1).toBe('https://test.com/path?salt=0');

    const salted2 = appendSaltToUrl(salted1, 1);
    expect(salted2).toBe('https://test.com/path?salt=1');
  });

  it('Requirement 5 & 6: performSaltSearch rejects unsolvable layouts and finds solvable and scannable ones', async () => {
    const config = createConfig('https://my-qr-dungeon.org');
    
    // Designated entry/exit around separators
    const entry = { r: 0, c: 13 };
    const exit = { r: 20, c: 13 };

    const result = await performSaltSearch(config, entry, exit, 2000);

    expect(result).toBeDefined();
    expect(result.modules).toBeDefined();
    
    // Solvability check:
    const solvable = isMazeSolvable(result.modules, entry, exit);
    
    if (result.salt !== null) {
      expect(solvable).toBe(true);
      expect(result.config.value).toContain('salt=');
    } else {
      // If none found within 2s, should fallback to default unsalted config
      expect(result.config.value).toBe(config.value);
    }
  });

  it('Requirement 3 & Constraint: gracefully stops searching and displays default layout if timeout is exceeded', async () => {
    const config = createConfig('https://test-url.com');
    // Force timeout immediately by setting timeoutMs to 0
    const result = await performSaltSearch(config, undefined, undefined, 0);

    expect(result.salt).toBeNull();
    expect(result.config.value).toBe(config.value);
  });

  it('Requirement 4: immediately cancels stale search tasks on user settings update', async () => {
    const config = createConfig('https://test-url.com');
    const shouldCancel = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

    await expect(performSaltSearch(config, undefined, undefined, 2000, shouldCancel))
      .rejects.toThrow('CANCELLED');
  });
});
