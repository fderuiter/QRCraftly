import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('focuses the scannability card container when Alt + S is pressed', () => {
    render(<ScannabilityIndicator status="physical-pass" health={{ score: 100, warnings: [] }} />);
    
    const wrapper = screen.getByTestId('scannability-feedback-wrapper');
    expect(wrapper).toBeInTheDocument();
    
    // Focus should not be on wrapper yet
    expect(document.activeElement).not.toBe(wrapper);

    // Fire Alt + s keydown event globally
    fireEvent.keyDown(window, { key: 's', altKey: true });

    // Focus should be shifted to wrapper
    expect(document.activeElement).toBe(wrapper);
  });

  it('card has high-contrast focus styles classes configured', () => {
    render(<ScannabilityIndicator status="physical-pass" health={{ score: 100, warnings: [] }} />);
    const wrapper = screen.getByTestId('scannability-feedback-wrapper');
    
    expect(wrapper).toHaveClass('focus:ring-2');
    expect(wrapper).toHaveClass('focus:ring-teal-600');
    expect(wrapper).toHaveClass('dark:focus:ring-teal-400');
  });
});
