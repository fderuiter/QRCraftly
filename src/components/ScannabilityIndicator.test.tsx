import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScannabilityIndicator } from './ScannabilityIndicator';

describe('ScannabilityIndicator - Screen Reader De-Cluttering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders null when status is idle', () => {
    const { container } = render(<ScannabilityIndicator status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders status and health score visually, but without role="alert"', () => {
    const health = { score: 70, warnings: ['Low Contrast'] };
    render(<ScannabilityIndicator status="fail" health={health} />);

    // Sighted users should see the status and warning
    expect(screen.getByText('Low Scannability')).toBeInTheDocument();
    expect(screen.getByText('Health: 70')).toBeInTheDocument();
    expect(screen.getByText('Low Contrast')).toBeInTheDocument();

    // Verify role="alert" has been removed
    const alertElements = screen.queryAllByRole('alert');
    expect(alertElements).toHaveLength(0);
  });

  it('contains a visually hidden polite live-region', () => {
    const health = { score: 70, warnings: ['Low Contrast'] };
    render(<ScannabilityIndicator status="fail" health={health} />);

    // Find the live-region with role="status" and polite live attribute
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveClass('sr-only');

    // Initially (before 1500ms debounce), it should be empty
    expect(statusRegion.textContent).toBe('');
  });

  it('delays polite screen reader announcement until 1,500ms has elapsed', () => {
    const health = { score: 70, warnings: ['Low Contrast'] };
    render(<ScannabilityIndicator status="fail" health={health} />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion.textContent).toBe('');

    // Advance time by 1000ms (not yet 1500ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(statusRegion.textContent).toBe('');

    // Advance remaining 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(statusRegion.textContent).toBe('Low Contrast');
  });

  it('resets the 1,500ms debounce timer on every new update (continuous typing)', () => {
    const { rerender } = render(
      <ScannabilityIndicator status="checking" health={{ score: 90, warnings: ['Text warning'] }} />
    );

    const statusRegion = screen.getByRole('status');
    expect(statusRegion.textContent).toBe('');

    // Simulate typing: update props every 100ms for 20 keystrokes (2000ms total)
    for (let i = 0; i < 20; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
        rerender(
          <ScannabilityIndicator
            status="checking"
            health={{ score: 90 - (i % 2), warnings: [`Text warning ${i}`] }}
          />
        );
      });
      // The screen reader should remain completely silent
      expect(statusRegion.textContent).toBe('');
    }

    // Now pause typing: let 1,499ms pass
    act(() => {
      vi.advanceTimersByTime(1499);
    });
    // Still silent at 1499ms
    expect(statusRegion.textContent).toBe('');

    // 1500ms reached
    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Polite screen reader announcement of the final active warning text
    expect(statusRegion.textContent).toBe('Text warning 19');
  });

  it('avoids duplicate announcements when the warning content does not change', () => {
    const health = { score: 75, warnings: ['Low Contrast'] };
    const { rerender } = render(<ScannabilityIndicator status="fail" health={health} />);

    const statusRegion = screen.getByRole('status');

    // Wait 1500ms for first announcement
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(statusRegion.textContent).toBe('Low Contrast');

    // Trigger a mock update that keeps the warning text the same
    act(() => {
      rerender(<ScannabilityIndicator status="fail" health={{ score: 75, warnings: ['Low Contrast'] }} />);
    });

    // Wait 1500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(statusRegion.textContent).toBe('Low Contrast');
  });

  it('updates the visual health score badge on every 100ms state change', () => {
    const { rerender } = render(
      <ScannabilityIndicator status="checking" health={{ score: 95, warnings: ['Minor Warn'] }} />
    );

    expect(screen.getByText('Health: 95')).toBeInTheDocument();

    // Sighted users see real-time updates every 100ms
    act(() => {
      rerender(<ScannabilityIndicator status="checking" health={{ score: 94, warnings: ['Minor Warn'] }} />);
    });
    expect(screen.getByText('Health: 94')).toBeInTheDocument();

    act(() => {
      rerender(<ScannabilityIndicator status="checking" health={{ score: 93, warnings: ['Minor Warn'] }} />);
    });
    expect(screen.getByText('Health: 93')).toBeInTheDocument();
  });
});
