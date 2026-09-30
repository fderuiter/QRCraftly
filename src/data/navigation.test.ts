import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV_ITEMS, QR_TYPE_ROUTES, getCurrentPrimaryNavId, normalizePathname } from './navigation';
import { QRType } from '@/types';

describe('primary navigation model', () => {
  it('contains the six primary destinations in order', () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Create QR',
      'Send File',
      'Receive File',
      'Arcade',
      'About',
      'Security',
    ]);
  });

  it('maps every QR type to a route', () => {
    for (const type of Object.values(QRType)) {
      expect(QR_TYPE_ROUTES[type]).toMatch(/^\//);
    }
  });

  it('identifies the current destination', () => {
    expect(getCurrentPrimaryNavId('/')).toBe('create');
    expect(getCurrentPrimaryNavId('/vcard-qr-code/')).toBe('create');
    expect(getCurrentPrimaryNavId('/file-transfer')).toBe('send');
    expect(getCurrentPrimaryNavId('/file-transfer/receive')).toBe('receive');
    expect(getCurrentPrimaryNavId('/about?x=1')).toBe('about');
    expect(getCurrentPrimaryNavId('/security#privacy')).toBe('security');
    expect(getCurrentPrimaryNavId('/arcade')).toBe('arcade');
    expect(getCurrentPrimaryNavId('/game')).toBeUndefined();
  });

  it('normalises pathnames', () => {
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('/about/')).toBe('/about');
    expect(normalizePathname('')).toBe('/');
  });
});
