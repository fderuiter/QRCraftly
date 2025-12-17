import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';

describe('StyleControls Accessibility', () => {
  const mockOnChange = vi.fn();

  it('Advanced Mode toggle should have correct aria attributes', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Find the Advanced Mode toggle button
    const advancedToggle = screen.getByRole('button', { name: /Advanced Mode/i });

    // Initial state: not expanded
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
    expect(advancedToggle).toHaveAttribute('aria-controls', 'advanced-settings-panel');

    // Click to expand
    fireEvent.click(advancedToggle);

    // Expect aria-expanded to be true
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');

    // Verify the panel exists and has the correct ID
    const panel = document.getElementById('advanced-settings-panel');
    expect(panel).toBeInTheDocument();

    // Verify content is inside the panel (e.g. Error Correction Level)
    expect(screen.getByText('Error Correction Level')).toBeInTheDocument();
    expect(panel).toContainElement(screen.getByText('Error Correction Level').closest('div')?.parentElement);
  });
});
