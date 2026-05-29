import { describe, it, expect } from 'vitest';
import { constructSocialString, hydrateSocialData } from './social';
import { SocialPlatform } from '../../types';

describe('Social generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      platform: SocialPlatform.TIKTOK,
      handle: 'qrcraftly',
    };
    const str = constructSocialString(data);
    const hydrated = hydrateSocialData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates unknown urls or raw strings', () => {
    const result = hydrateSocialData('random');
    expect(result.handle).toBe('');

    const result2 = hydrateSocialData('https://example.com/user');
    expect(result2.handle).toBe('');
  });
});

it('hydrates instagram', () => {
  const hydrated = hydrateSocialData('https://instagram.com/qrcraftly');
  expect(hydrated.platform).toBe(SocialPlatform.INSTAGRAM);
  expect(hydrated.handle).toBe('qrcraftly');
});

it('hydrates twitter', () => {
  const hydrated = hydrateSocialData('https://x.com/qrcraftly');
  expect(hydrated.platform).toBe(SocialPlatform.TWITTER);
  expect(hydrated.handle).toBe('qrcraftly');
});

it('hydrates handle fallback', () => {
  const hydrated = hydrateSocialData('https://instagram.com/');
  expect(hydrated.handle).toBe('');
  const hydrated2 = hydrateSocialData('https://x.com/');
  expect(hydrated2.handle).toBe('');
  const hydrated3 = hydrateSocialData('https://tiktok.com/');
  expect(hydrated3.handle).toBe('');
});

it('handles unknown platform', () => {
  const data = {
    platform: 'UNKNOWN' as SocialPlatform,
    handle: 'qrcraftly',
  };
  const str = constructSocialString(data);
  expect(str).toBe('');
});
