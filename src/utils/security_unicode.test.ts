
import { describe, it, expect } from 'vitest';
import { isDangerousUrl } from './security';

describe('isDangerousUrl Security Bypasses', () => {
  it('should detect javascript protocol with zero width space', () => {
    // \u200B is Zero Width Space
    const dangerous = 'jav\u200Bascript:alert(1)';
    expect(isDangerousUrl(dangerous)).toBe(true);
  });

  it('should detect javascript protocol with zero width non-joiner', () => {
    // \u200C is Zero Width Non-Joiner
    const dangerous = 'jav\u200Cascript:alert(1)';
    expect(isDangerousUrl(dangerous)).toBe(true);
  });

  it('should detect javascript protocol with zero width joiner', () => {
    // \u200D is Zero Width Joiner
    const dangerous = 'jav\u200Dascript:alert(1)';
    expect(isDangerousUrl(dangerous)).toBe(true);
  });

  it('should detect javascript protocol with mixed case and control chars', () => {
    const dangerous = 'J\u0000a\u0001v\u0002a\u0003s\u0004c\u0005r\u0006i\u0007p\u0008t:alert(1)';
    expect(isDangerousUrl(dangerous)).toBe(true);
  });
});
