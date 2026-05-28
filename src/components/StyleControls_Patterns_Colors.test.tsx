import { render, screen } from '@testing-library/react';
import { PatternControls } from './style-controls/PatternControls';
import { ColorControls } from './style-controls/ColorControls';
import { DEFAULT_CONFIG } from '../constants';
import { describe, it, expect, vi } from 'vitest';

describe('StyleControls Accessibility', () => {
  describe('PatternControls', () => {
    it('renders with correct accessibility attributes', () => {
      const handleChange = vi.fn();
      render(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);

      // Check group role and label
      const group = screen.getByRole('group', { name: /pattern style/i });
      expect(group).toBeInTheDocument();

      // Check buttons have aria-labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toMatch(/select .* pattern/i);
      });

      // Check aria-pressed state
      const standardButton = screen.getByLabelText(/select standard industrial pattern/i);
      expect(standardButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('ColorControls', () => {
    it('renders with correct accessibility attributes', () => {
      const handleChange = vi.fn();
      render(<ColorControls config={DEFAULT_CONFIG} onChange={handleChange} />);

      // Check group role and label
      const group = screen.getByRole('group', { name: /color presets/i });
      expect(group).toBeInTheDocument();

      // Check preset buttons have aria-labels
      // Note: ColorControls renders other buttons/inputs too, so we filter by the preset group
      // Ideally we query within the group
      const presetsGroup = screen.getByRole('group', { name: /color presets/i });
      const presetButtons = presetsGroup.querySelectorAll('button');

      expect(presetButtons.length).toBeGreaterThan(0);
      presetButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toMatch(/select .* theme/i);
      });
    });
  });
});
