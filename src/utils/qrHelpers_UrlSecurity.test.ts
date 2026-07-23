import { describe, it, expect } from 'vitest';
import { constructUrlString } from './qr-generators/url';

describe('qrHelpers Security - URL', () => {
  it('should allow raw value for javascript: protocol', () => {
    const dangerousPayload = 'javascript:alert(1)';
    const result = constructUrlString({
      url: dangerousPayload
    });
    expect(result).toBe(dangerousPayload);
  });

  it('should allow raw value for vbscript: protocol', () => {
    const dangerousPayload = 'vbscript:msgbox(1)';
    const result = constructUrlString({
      url: dangerousPayload
    });
    expect(result).toBe(dangerousPayload);
  });

  it('should allow valid protocols like https:', () => {
    const validPayload = 'https://example.com';
    const result = constructUrlString({
      url: validPayload
    });
    expect(result).toBe(validPayload);
  });
});
