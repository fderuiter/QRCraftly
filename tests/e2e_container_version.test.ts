import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('E2E Playwright container image', () => {
  it('matches the locked @playwright/test version', () => {
    const workflow = fs.readFileSync(path.resolve(process.cwd(), '.github/workflows/main.yml'), 'utf8');
    const lockfile = fs.readFileSync(path.resolve(process.cwd(), 'pnpm-lock.yaml'), 'utf8');

    const imageMatch = workflow.match(/mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)/);
    const lockMatch = lockfile.match(/^ {2}'?@playwright\/test@(\d+\.\d+\.\d+)'?:/m);

    expect(imageMatch, 'main.yml should run E2E in the Playwright image').not.toBeNull();
    expect(lockMatch, 'pnpm-lock.yaml should lock @playwright/test').not.toBeNull();
    expect(imageMatch?.[1]).toBe(lockMatch?.[1]);
  });
});
