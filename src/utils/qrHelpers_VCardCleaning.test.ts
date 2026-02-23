
import { describe, it, expect } from 'vitest';
import { escapeVCardString } from './qrHelpers';

describe('QR Helpers VCard Cleaning', () => {
  it('should normalize unicode line separators to \\n', () => {
    // \u2028: Line Separator, \u2029: Paragraph Separator
    const input = 'Line 1\u2028Line 2\u2029Line 3';
    const result = escapeVCardString(input);
    // Expect normalization to literal \n which vCard uses for escaped newlines
    expect(result).toBe('Line 1\\nLine 2\\nLine 3');
  });

  it('should strip invisible characters', () => {
    // \u200B: Zero Width Space, \uFEFF: BOM
    const input = 'Hidden\u200BText\uFEFF';
    const result = escapeVCardString(input);
    expect(result).toBe('HiddenText');
  });

  it('should handle mixed standard and unicode newlines', () => {
    const input = 'Standard\nUnicode\u2028Mixed';
    const result = escapeVCardString(input);
    expect(result).toBe('Standard\\nUnicode\\nMixed');
  });
});
