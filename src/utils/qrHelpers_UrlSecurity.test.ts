import { describe, it, expect } from 'vitest';
import { constructUrlString } from './qrHelpers';

describe('qrHelpers Security - URL', () => {
  it('should block javascript: protocol', () => {
    const dangerousPayload = 'javascript:alert(1)';
    const result = constructUrlString({
      url: dangerousPayload,
    });
    expect(result).toBe('');
  });

  it('should block vbscript: protocol', () => {
    const dangerousPayload = 'vbscript:msgbox(1)';
    const result = constructUrlString({
      url: dangerousPayload,
    });
    expect(result).toBe('');
  });

  it('should allow valid protocols like https:', () => {
    const validPayload = 'https://example.com';
    const result = constructUrlString({
      url: validPayload,
    });
    expect(result).toBe(validPayload);
  });
});
