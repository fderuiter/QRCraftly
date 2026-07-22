import { describe, it, expect } from 'vitest';
import { constructSocialString, hydrateSocialData } from './social';
import { SocialPlatform } from '../../types';

describe('Social generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      platform: SocialPlatform.TIKTOK,
      handle: 'qrcraftly'
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

  it('hydrates urls with www. prefix', () => {
    const hydrated = hydrateSocialData('https://www.instagram.com/qrcraftly');
    expect(hydrated.platform).toBe(SocialPlatform.INSTAGRAM);
    expect(hydrated.handle).toBe('qrcraftly');
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
      handle: 'qrcraftly'
    };
    const str = constructSocialString(data);
    expect(str).toBe('');
  });

  it('sanitizes handles correctly by stripping invalid characters', () => {
    // strips leading @ sign
    expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: '@username' }))
      .toBe('https://instagram.com/username');
      
    // strips path-injection characters (slashes)
    expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: 'user/../../etc' }))
      .toBe('https://instagram.com/user....etc');
      
    // strips query string characters
    expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: 'user?x=1' }))
      .toBe('https://instagram.com/userx1');
      
    // strips hash characters
    expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: 'user#fragment' }))
      .toBe('https://instagram.com/userfragment');
      
    // allows underscores, hyphens, and periods
    expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: 'user_name.test-123' }))
      .toBe('https://instagram.com/user_name.test-123');
  });
});
