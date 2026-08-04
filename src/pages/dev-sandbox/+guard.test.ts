import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { guard } from './+guard';

describe('Developer Sandbox Guard', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks access in production mode by throwing a Vike 404 abort error', () => {
    vi.stubEnv('PROD', true);

    let thrownError: any = null;
    try {
      guard();
    } catch (e) {
      thrownError = e;
    }

    // Verify an abort error was thrown
    expect(thrownError).toBeDefined();
    expect(thrownError._isAbortError).toBe(true);

    // Verify it is a Vike 404 abort error as returned by render(404, ...)
    expect(thrownError._pageContextAbort?.abortStatusCode).toBe(404);
    expect(thrownError._pageContextAbort?.abortReason).toBe(
      'Developer sandbox is only available in development mode.'
    );
  });

  it('allows silent execution and normal routing in development mode', () => {
    // Setting PROD to false evaluates import.meta.env.PROD to false
    vi.stubEnv('PROD', false);

    expect(() => guard()).not.toThrow();
  });
});
