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
import { constructLocationString } from './qr-generators/location';
import { constructMeetingString } from './qr-generators/meeting';
import { constructSocialString, sanitizeSocialHandle } from './qr-generators/social';
import { SocialPlatform } from '../types';

describe('Location generator', () => {
  it('constructs a valid geo URI', () => {
    expect(constructLocationString({ latitude: '40.7128', longitude: '-74.0060' })).toBe('geo:40.7128,-74.006');
  });

  it('returns empty string for empty latitude', () => {
    expect(constructLocationString({ latitude: '', longitude: '-74.0060' })).toBe('');
  });

  it('returns empty string for empty longitude', () => {
    expect(constructLocationString({ latitude: '40.7128', longitude: '' })).toBe('');
  });

  it('returns empty string for out-of-range latitude (> 90)', () => {
    expect(constructLocationString({ latitude: '91', longitude: '0' })).toBe('');
  });

  it('returns empty string for out-of-range latitude (< -90)', () => {
    expect(constructLocationString({ latitude: '-91', longitude: '0' })).toBe('');
  });

  it('returns empty string for out-of-range longitude (> 180)', () => {
    expect(constructLocationString({ latitude: '0', longitude: '181' })).toBe('');
  });

  it('returns empty string for out-of-range longitude (< -180)', () => {
    expect(constructLocationString({ latitude: '0', longitude: '-181' })).toBe('');
  });

  it('returns empty string for non-numeric input', () => {
    expect(constructLocationString({ latitude: 'abc', longitude: '0' })).toBe('');
  });

  it('handles boundary values', () => {
    expect(constructLocationString({ latitude: '90', longitude: '180' })).toBe('geo:90,180');
    expect(constructLocationString({ latitude: '-90', longitude: '-180' })).toBe('geo:-90,-180');
  });
});

describe('Meeting generator', () => {
  it('returns the URL as-is for a valid meeting link', () => {
    const url = 'https://zoom.us/j/123456789?pwd=AbCdEfGh';
    expect(constructMeetingString({ url })).toBe(url);
  });

  it('returns empty string for empty URL', () => {
    expect(constructMeetingString({ url: '' })).toBe('');
  });

  it('returns empty string for dangerous URL', () => {
    expect(constructMeetingString({ url: 'javascript:alert(1)' })).toBe('');
  });

  it('trims whitespace from the URL', () => {
    expect(constructMeetingString({ url: '  https://meet.google.com/abc-defg-hij  ' })).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
  });
});

describe('Social generator', () => {
  describe('sanitizeSocialHandle', () => {
    it('strips leading @ sign', () => {
      expect(sanitizeSocialHandle('@username')).toBe('username');
    });

    it('strips path-injection characters (slashes)', () => {
      expect(sanitizeSocialHandle('user/../../etc')).toBe('user....etc');
      // Slashes are stripped, dots remain (they're valid in usernames), result is safe
    });

    it('strips query string characters', () => {
      expect(sanitizeSocialHandle('user?x=1')).toBe('userx1');
    });

    it('strips hash characters', () => {
      expect(sanitizeSocialHandle('user#fragment')).toBe('userfragment');
    });

    it('allows underscores, hyphens, and periods', () => {
      expect(sanitizeSocialHandle('user_name.test-123')).toBe('user_name.test-123');
    });
  });

  describe('constructSocialString', () => {
    it('generates an Instagram profile URL', () => {
      expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: 'myuser' })).toBe(
        'https://instagram.com/myuser',
      );
    });

    it('generates a Twitter/X profile URL', () => {
      expect(constructSocialString({ platform: SocialPlatform.TWITTER, handle: 'myuser' })).toBe(
        'https://x.com/myuser',
      );
    });

    it('generates a TikTok profile URL', () => {
      expect(constructSocialString({ platform: SocialPlatform.TIKTOK, handle: 'myuser' })).toBe(
        'https://tiktok.com/@myuser',
      );
    });

    it('strips @ from handle in generated URL', () => {
      expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: '@myuser' })).toBe(
        'https://instagram.com/myuser',
      );
    });

    it('returns empty string for empty handle', () => {
      expect(constructSocialString({ platform: SocialPlatform.INSTAGRAM, handle: '' })).toBe('');
    });

    it('sanitizes a malicious handle to prevent URI injection', () => {
      const result = constructSocialString({
        platform: SocialPlatform.INSTAGRAM,
        handle: '../../../etc/passwd',
      });
      // The slash characters are stripped; result should be safe
      expect(result).not.toContain('../');
      expect(result).not.toContain('/etc/');
    });
  });
});
