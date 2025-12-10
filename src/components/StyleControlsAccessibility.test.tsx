
import { render, screen } from '@testing-library/react';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { describe, it, expect, vi } from 'vitest';

describe('StyleControls Accessibility', () => {
  const mockOnChange = vi.fn();

  it('renders Upload Logo as a button', () => {
    // Ensure the upload area is now an accessible button instead of a clickable div
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);
    const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
    expect(uploadButton).toBeInTheDocument();
    // Verify it's not just a div with a role, but an actual button (implied by getByRole if properly implemented, but let's check tag)
    expect(uploadButton.tagName).toBe('BUTTON');
  });

  it('Pattern buttons have aria-pressed state', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Find the currently selected pattern button (Standard is default)
    // Note: The label text "Standard Industrial" is split into spans or text nodes in the component?
    // Actually the text is just "Standard Industrial" inside the button.
    // However, the test uses getByText which matches partial or full.
    // Let's find the button containing "Standard Industrial".

    // We can use getAllByRole('button') and filter or just check specific ones.
    const standardButton = screen.getByRole('button', { name: /Standard Industrial/i });

    // Since DEFAULT_CONFIG.style is likely Standard (depending on constant), let's check if it's pressed.
    // Actually DEFAULT_CONFIG usually has a style. Let's assume it matches one.
    // We can check if `aria-pressed` attribute exists.
    expect(standardButton).toHaveAttribute('aria-pressed');
  });

  it('Color preset buttons have aria-labels', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Use a specific known preset label from PRESET_COLORS constant
    // Examples: "Classic", "Slate", "Teal Brand", etc.
    const classicButton = screen.getByRole('button', { name: /Select Classic theme/i });
    expect(classicButton).toBeInTheDocument();
  });
});
