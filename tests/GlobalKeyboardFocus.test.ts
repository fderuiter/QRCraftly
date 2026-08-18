import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Global Keyboard Focus Restoration', () => {
  const cssPath = join(__dirname, '../src/layouts/index.css');

  it('should ensure the global stylesheet index.css exists', () => {
    expect(existsSync(cssPath)).toBe(true);
  });

  it('should restore transparent outline on active, keyboard-focused elements and peers', () => {
    const cssContent = readFileSync(cssPath, 'utf8');

    // Verify focus-visible selectors are defined
    expect(cssContent).toContain(':focus-visible,');
    expect(cssContent).toContain(':focus-visible + .peer,');
    expect(cssContent).toContain(':focus-visible ~ .peer');

    // Verify transparent outline and offset are configured correctly with !important
    expect(cssContent).toContain('outline: 2px solid transparent !important;');
    expect(cssContent).toContain('outline-offset: 2px !important;');
  });

  it('should suppress outline rendering for mouse-clicked elements to preserve standard styles', () => {
    const cssContent = readFileSync(cssPath, 'utf8');

    // Verify mouse-click selectors are defined
    expect(cssContent).toContain(':focus:not(:focus-visible),');
    expect(cssContent).toContain(':focus:not(:focus-visible) + .peer,');
    expect(cssContent).toContain(':focus:not(:focus-visible) ~ .peer');

    // Verify outline suppression with !important
    expect(cssContent).toContain('outline: none !important;');
  });

  it('should maintain visible focus outline under forced-colors / OS high contrast mode', () => {
    const cssContent = readFileSync(cssPath, 'utf8');

    // Verify forced-colors media query and Highlight outline
    expect(cssContent).toContain('@media (forced-colors: active)');
    expect(cssContent).toContain('outline: 2px solid Highlight !important;');
  });
});
