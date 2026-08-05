import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isFalsePositive,
  scanFile,
  CLOUDFLARE_REGEX,
  SMTP_PASS_REGEX,
  SMTP_URI_REGEX,
} from '../scripts/secret-scanner.js';

describe('secret-scanner', () => {
  describe('isFalsePositive', () => {
    it('should identify environment variable references as false positives', () => {
      expect(isFalsePositive('process.env.CF_KEY')).toBe(true);
      expect(isFalsePositive('import.meta.env.CF_KEY')).toBe(true);
      expect(isFalsePositive('$CF_KEY')).toBe(true);
      expect(isFalsePositive('${CF_KEY}')).toBe(true);
    });

    it('should identify standard placeholder patterns as false positives', () => {
      expect(isFalsePositive('<your-cloudflare-token>')).toBe(true);
      expect(isFalsePositive('your_smtp_password')).toBe(true);
      expect(isFalsePositive('placeholder-token')).toBe(true);
      expect(isFalsePositive('dummy-value')).toBe(true);
    });

    it('should identify self-assignments as false positives', () => {
      expect(isFalsePositive('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN')).toBe(true);
      expect(isFalsePositive('SMTP_PASS', 'SMTP_PASS')).toBe(true);
    });

    it('should identify extremely short strings as false positives', () => {
      expect(isFalsePositive('123')).toBe(true);
      expect(isFalsePositive('   ')).toBe(true);
    });

    it('should identify legitimate dummy keys/secrets as NOT false positives', () => {
      expect(isFalsePositive('1234567890123456789012345678901234567', 'CF_API_KEY')).toBe(false);
      expect(isFalsePositive('mySecretSmtpPass123', 'SMTP_PASS')).toBe(false);
    });
  });

  describe('Regex Patterns', () => {
    it('should match standard SMTP connection strings', () => {
      const line = 'const smtpUrl = "smtp://username:my_secure_password@smtp.mailtrap.io:2525";';
      const match = line.match(SMTP_URI_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('my_secure_password');
    });

    it('should match SMTP passwords/keys assignment', () => {
      const line = 'SMTP_PASS="super_secret_smtp_password"';
      const match = line.match(SMTP_PASS_REGEX);
      expect(match).not.toBeNull();
      expect(match![3]).toBe('super_secret_smtp_password');
    });

    it('should match Cloudflare API keys and tokens assignment', () => {
      const line1 = 'const CLOUDFLARE_API_KEY = "1234567890123456789012345678901234567";';
      const match1 = line1.match(CLOUDFLARE_REGEX);
      expect(match1).not.toBeNull();
      expect(match1![4]).toBe('1234567890123456789012345678901234567');

      const line2 = 'cf_token: "abcdefghijklmnopqrstuvwxyz0123456789abcd"';
      const match2 = line2.match(CLOUDFLARE_REGEX);
      expect(match2).not.toBeNull();
      expect(match2![4]).toBe('abcdefghijklmnopqrstuvwxyz0123456789abcd');
    });
  });

  describe('scanFile', () => {
    const tempFileWithSecret = path.resolve('tests/temp-test-secret.ts');
    const tempFileClean = path.resolve('tests/temp-test-clean.ts');

    beforeAll(() => {
      fs.writeFileSync(
        tempFileWithSecret,
        `
        // File containing simulated dummy secrets
        const config = {
          cloudflare_api_key: "1234567890123456789012345678901234567",
          smtp_password: "mySecretSmtpPass123",
          smtp_uri: "smtp://user:superSecretPassword@smtp.example.com",
        };
        `,
        'utf8'
      );

      fs.writeFileSync(
        tempFileClean,
        `
        // File containing safe, placeholder secrets and environment variable references
        const config = {
          cloudflare_api_key: process.env.CLOUDFLARE_API_KEY,
          smtp_password: "<your-smtp-password>",
          smtp_uri: "smtp://user:\${process.env.SMTP_PASSWORD}@smtp.example.com",
        };
        `,
        'utf8'
      );
    });

    afterAll(() => {
      if (fs.existsSync(tempFileWithSecret)) fs.unlinkSync(tempFileWithSecret);
      if (fs.existsSync(tempFileClean)) fs.unlinkSync(tempFileClean);
    });

    it('should successfully detect all secrets in a file with secrets', () => {
      const findings = scanFile(tempFileWithSecret);
      expect(findings.length).toBe(3);

      const types = findings.map(f => f.type);
      expect(types).toContain('Cloudflare API Secret/Token');
      expect(types).toContain('SMTP Password/Credential Assignment');
      expect(types).toContain('SMTP URI Connection String');
    });

    it('should ignore all patterns in a clean file', () => {
      const findings = scanFile(tempFileClean);
      expect(findings.length).toBe(0);
    });
  });
});
