import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFiles, verifyBundleSize } from '../scripts/check-bundle-size.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_TEST_DIR = path.resolve(__dirname, './temp_bundle_size_test');

describe('Bundle Size Verification Script Tests', () => {
  beforeEach(() => {
    if (fs.existsSync(TEMP_TEST_DIR)) {
      fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_TEST_DIR)) {
      fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should recursively get all file paths in a directory', () => {
    fs.writeFileSync(path.join(TEMP_TEST_DIR, 'file1.txt'), 'Hello');
    
    const subDir = path.join(TEMP_TEST_DIR, 'subdir');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'file2.txt'), 'World');

    const files = getFiles(TEMP_TEST_DIR);
    expect(files).toHaveLength(2);
    expect(files.some(f => f.endsWith('file1.txt'))).toBe(true);
    expect(files.some(f => f.endsWith('file2.txt'))).toBe(true);
  });

  it('should verify gzipped bundle size limit checks within limit', () => {
    fs.writeFileSync(path.join(TEMP_TEST_DIR, 'file1.txt'), 'Short text content.');
    
    const result = verifyBundleSize(TEMP_TEST_DIR, 10); // 10 KB limit
    expect(result.exceeds).toBe(false);
    expect(result.reports).toHaveLength(1);
    expect(result.totalRawSize).toBeGreaterThan(0);
    expect(result.totalGzipSize).toBeGreaterThan(0);
  });

  it('should detect when gzipped size exceeds the specified limit', () => {
    // Write 5 KB of text to exceed a 1 KB limit (with compression, it will still exceed 1 KB)
    const bulkyContent = 'A'.repeat(5000);
    fs.writeFileSync(path.join(TEMP_TEST_DIR, 'heavy.txt'), bulkyContent);

    const result = verifyBundleSize(TEMP_TEST_DIR, 0.01); // 10 bytes limit
    // Verify results
    expect(result.exceeds).toBe(true);
  });
});
