import { describe, it, expect } from 'vitest';
import { validateImageUpload } from './security';

describe('Image Validation', () => {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  it('should validate a valid PNG image', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    const result = validateImageUpload(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate a valid JPEG image', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const result = validateImageUpload(file);
    expect(result.valid).toBe(true);
  });

  it('should validate a valid WebP image', () => {
    const file = new File([''], 'test.webp', { type: 'image/webp' });
    const result = validateImageUpload(file);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid file types (e.g., SVG)', () => {
    const file = new File([''], 'test.svg', { type: 'image/svg+xml' });
    const result = validateImageUpload(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should reject invalid file types (e.g., Text)', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    const result = validateImageUpload(file);
    expect(result.valid).toBe(false);
  });

  it('should reject files exceeding the size limit', () => {
    // Create a mock file with a size larger than 2MB
    const largeContent = new Uint8Array(MAX_FILE_SIZE + 1);
    const file = new File([largeContent], 'large.png', { type: 'image/png' });

    const result = validateImageUpload(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File size too large');
  });

  it('should validate files exactly at the size limit', () => {
    const exactContent = new Uint8Array(MAX_FILE_SIZE);
    const file = new File([exactContent], 'limit.png', { type: 'image/png' });

    const result = validateImageUpload(file);
    expect(result.valid).toBe(true);
  });
});
