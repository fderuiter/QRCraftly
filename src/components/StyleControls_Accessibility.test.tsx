import { render, screen } from '@testing-library/react';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

describe('StyleControls Accessibility', () => {
  const mockOnChange = vi.fn();

  it('Advanced Mode toggle has correct ARIA attributes', async () => {
    const user = userEvent.setup();
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    const toggle = screen.getByText('Advanced Mode').closest('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'advanced-panel');

    // Click to expand
    if (toggle) await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById('advanced-panel');
    expect(panel).toBeInTheDocument();
  });

  it('Pattern style buttons have aria-pressed', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Find a pattern button (e.g., Standard)
    const buttons = screen.getAllByRole('button');
    // We can't easily select by role='button' only because there are many.
    // But we know pattern buttons are inside "Pattern Style" section.
    // Let's assume the button with the current style (Standard) is pressed.

    // We can look for the button containing "Standard" text
    const standardBtn = screen.getByText(/Standard/).closest('button');
    expect(standardBtn).toHaveAttribute('aria-pressed', 'true');

    const otherBtn = screen.getByText(/Swiss Dot/).closest('button');
    expect(otherBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('Color preset buttons have aria-label', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // PRESET_COLORS constant has labels like "Classic", "Slate", etc.
    const classicBtn = screen.getByLabelText('Classic');
    expect(classicBtn).toBeInTheDocument();
  });
});
