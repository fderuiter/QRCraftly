import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDynamicFocus } from './useDynamicFocus';

function TestForm({ initialFields, showConditional }: { initialFields: string[], showConditional: boolean }) {
  const containerRef = useDynamicFocus<HTMLDivElement>([showConditional]);
  return (
    <div ref={containerRef}>
      {initialFields.includes('ssid') && (
        <div>
          <label htmlFor="wifi-ssid">SSID</label>
          <input id="wifi-ssid" defaultValue="MySSID" />
        </div>
      )}
      {showConditional && (
        <div>
          <label htmlFor="wifi-identity">Identity / Username</label>
          <input id="wifi-identity" placeholder="e.g. user@domain.com" />
        </div>
      )}
      {initialFields.includes('password') && (
        <div>
          <label htmlFor="wifi-password">Password (Optional)</label>
          <input id="wifi-password" type="password" />
        </div>
      )}
    </div>
  );
}

describe('useDynamicFocus hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clean up any left-over live regions
    const lr = document.getElementById('dynamic-focus-live-region');
    if (lr) {
      lr.remove();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should skip initial form load focus transition', async () => {
    render(<TestForm initialFields={['ssid']} showConditional={false} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const ssidInput = document.getElementById('wifi-ssid');
    expect(document.activeElement).not.toBe(ssidInput);
    
    const lr = document.getElementById('dynamic-focus-live-region');
    expect(lr).toBeNull();
  });

  it('should focus the newly mounted conditional field and announce it', async () => {
    const { rerender } = render(<TestForm initialFields={['ssid', 'password']} showConditional={false} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Mount conditional field
    rerender(<TestForm initialFields={['ssid', 'password']} showConditional={true} />);

    // Flush MutationObserver microtask
    await act(async () => {
      await Promise.resolve();
    });
    // Advance timers so that the 50ms setTimeout fires
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const identityInput = document.getElementById('wifi-identity');
    expect(document.activeElement).toBe(identityInput);

    const lr = document.getElementById('dynamic-focus-live-region');
    expect(lr).not.toBeNull();
    expect(lr?.textContent).toContain('Identity / Username field is now available');
  });

  it('should shift focus to the nearest remaining field when a focused field is unmounted', async () => {
    const { rerender } = render(<TestForm initialFields={['ssid', 'password']} showConditional={true} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const identityInput = document.getElementById('wifi-identity') as HTMLElement;
    identityInput.focus();
    expect(document.activeElement).toBe(identityInput);

    // Unmount identity input
    rerender(<TestForm initialFields={['ssid', 'password']} showConditional={false} />);

    // Flush MutationObserver microtask
    await act(async () => {
      await Promise.resolve();
    });
    // Advance timers so that the 50ms setTimeout fires
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // The nearest remaining element after identity (which was index 1) is password (which is now index 1)
    const passwordInput = document.getElementById('wifi-password');
    expect(document.activeElement).toBe(passwordInput);

    const lr = document.getElementById('dynamic-focus-live-region');
    expect(lr).not.toBeNull();
    expect(lr?.textContent).toContain('Identity / Username removed');
  });
});
