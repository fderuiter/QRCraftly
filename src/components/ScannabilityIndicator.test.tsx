import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'vitest-axe';
import { ScannabilityIndicator } from './ScannabilityIndicator';

describe('ScannabilityIndicator Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders immediate visual elements for physical-pass status', () => {
    render(<ScannabilityIndicator status="physical-pass" health={{ score: 100, warnings: [] }} />);
    
    // Visual indicators are present immediately
    expect(screen.getByText('Print simulation verified')).toBeInTheDocument();
    expect(screen.getByText('Health: 100')).toBeInTheDocument();
  });

  it('explains screen verification without presenting it as an export failure', () => {
    render(<ScannabilityIndicator status="digital-pass" health={{ score: 100, warnings: [] }} />);

    expect(screen.getByText('Screen scan verified')).toBeInTheDocument();
    expect(screen.getByText('Test with a physical camera before large print runs.')).toBeInTheDocument();
  });

  it('aligns the score badge with the safe threshold at exactly 80', () => {
    render(<ScannabilityIndicator status="digital-pass" health={{ score: 80, warnings: ['Review before printing'] }} />);

    expect(screen.getByText('Health: 80')).toHaveClass('bg-emerald-100');
    expect(screen.getByText('Review before printing')).toHaveClass('text-amber-700');
  });

  it('renders immediate visual elements for fail status with warning text', () => {
    const health = { score: 40, warnings: ['Low contrast'] };
    render(<ScannabilityIndicator status="fail" health={health} />);

    expect(screen.getByText('Scan verification failed')).toBeInTheDocument();
    expect(screen.getByText('Health: 40')).toBeInTheDocument();
    expect(screen.getByText('Low contrast')).toBeInTheDocument();
  });

  it('debounces screen reader announcements by 1000ms', () => {
    const { rerender } = render(<ScannabilityIndicator status="checking" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    
    // Initially, during inputs, the announcement is cleared/empty
    expect(liveRegion.textContent).toBe('');

    // Advance 500ms - still empty (since debounce is 1000ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(liveRegion.textContent).toBe('');

    // Now update props again before 1000ms completes (active input continues)
    rerender(<ScannabilityIndicator status="physical-pass" health={{ score: 95, warnings: [] }} />);
    expect(liveRegion.textContent).toBe('');

    // Advance another 500ms (total 1000ms elapsed since start, but only 500ms since last change)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(liveRegion.textContent).toBe('');

    // Now let 1000ms pass without any input/prop change
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(liveRegion.textContent).toBe('Scannability status: Print simulation verified. Health score: 95.');
  });

  it('is not a tab stop and does not register a global Alt+S shortcut', () => {
    render(<ScannabilityIndicator status="physical-pass" health={{ score: 100, warnings: [] }} />);
    const wrapper = screen.getByTestId('scannability-feedback-wrapper');

    expect(wrapper).not.toHaveAttribute('tabindex');
    expect(wrapper.querySelector('[tabindex]')).toBeNull();

    const event = new KeyboardEvent('keydown', { key: 's', altKey: true, bubbles: true, cancelable: true });
    fireEvent(window, event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(wrapper);
  });

  it('keeps exactly one polite status region, including while idle', () => {
    const { rerender } = render(<ScannabilityIndicator status="idle" />);
    expect(screen.getAllByRole('status')).toHaveLength(1);

    rerender(<ScannabilityIndicator status="checking" />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces a failure once through a single alert, not through the polite region', () => {
    const { rerender } = render(<ScannabilityIndicator status="checking" />);
    rerender(<ScannabilityIndicator status="fail" health={{ score: 40, warnings: ['Low contrast'] }} />);

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Low contrast');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('status').textContent).toBe('');
    // The visible badge carries no live role of its own.
    expect(screen.getByText('Scan verification failed').closest('[role]')?.getAttribute('role')).not.toBe('alert');
    expect(document.querySelector('[aria-live="off"]')).toBeNull();
  });

  it('still raises an alert for a failure without warnings', () => {
    render(<ScannabilityIndicator status="fail" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Scan verification failed/i);
  });

  it('does not raise an alert for non-failing warnings', () => {
    render(<ScannabilityIndicator status="digital-pass" health={{ score: 85, warnings: ['Review before printing'] }} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Review before printing')).toBeInTheDocument();
  });

  it('has no axe violations in pass and fail states', async () => {
    vi.useRealTimers();
    const { container, rerender } = render(<ScannabilityIndicator status="physical-pass" health={{ score: 100, warnings: [] }} />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<ScannabilityIndicator status="fail" health={{ score: 30, warnings: ['Low contrast'] }} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders recovery action buttons when status is fail and callbacks are provided', () => {
    const handleAutoFix = vi.fn();
    const handleReset = vi.fn();

    render(
      <ScannabilityIndicator
        status="fail"
        health={{ score: 30, warnings: ['Low contrast'] }}
        onAutoFixContrast={handleAutoFix}
        onResetDefault={handleReset}
      />
    );

    const autoFixBtn = screen.getByRole('button', { name: 'Auto-Fix Contrast' });
    const resetBtn = screen.getByRole('button', { name: 'Reset Defaults' });

    expect(autoFixBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(autoFixBtn);
    expect(handleAutoFix).toHaveBeenCalledTimes(1);

    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('does not render recovery action buttons when callbacks are omitted or status is not fail', () => {
    const handleAutoFix = vi.fn();
    const handleReset = vi.fn();

    const { rerender } = render(
      <ScannabilityIndicator
        status="fail"
        health={{ score: 30, warnings: ['Low contrast'] }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Auto-Fix Contrast' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset Defaults' })).not.toBeInTheDocument();

    rerender(
      <ScannabilityIndicator
        status="physical-pass"
        health={{ score: 100, warnings: [] }}
        onAutoFixContrast={handleAutoFix}
        onResetDefault={handleReset}
      />
    );

    expect(screen.queryByRole('button', { name: 'Auto-Fix Contrast' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset Defaults' })).not.toBeInTheDocument();
  });
});
