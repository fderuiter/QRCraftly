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
    expect(screen.getByText('Physical-Ready')).toBeInTheDocument();
    expect(screen.getByText('Health: 100')).toBeInTheDocument();
  });

  it('renders immediate visual elements for fail status with warning text', () => {
    const health = { score: 40, warnings: ['Low contrast'] };
    render(<ScannabilityIndicator status="fail" health={health} />);

    expect(screen.getByText('Low Scannability')).toBeInTheDocument();
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
    expect(liveRegion.textContent).toBe('Scannability status: Physical-Ready. Health score: 95.');
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
