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
      const group = screen.getByRole('radiogroup', { name: /pattern style/i });
      expect(group).toBeInTheDocument();

      // Check radios have aria-labels
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('aria-label');
        expect(radio.getAttribute('aria-label')).toMatch(/select .* pattern/i);
      });

      // Check checked state
      const standardRadio = screen.getByLabelText(/select standard industrial pattern/i);
      expect(standardRadio).toBeChecked();
    });
  });

  describe('ColorControls', () => {
    it('renders with correct accessibility attributes', () => {
      const handleChange = vi.fn();
      render(<ColorControls config={DEFAULT_CONFIG} onChange={handleChange} />);

      // Check group role and label
      const group = screen.getByRole('radiogroup', { name: /color presets/i });
      expect(group).toBeInTheDocument();

      // Check preset radios have aria-labels
      // Note: ColorControls renders other buttons/inputs too, so we filter by the preset group
      // Ideally we query within the group
      const presetsGroup = screen.getByRole('radiogroup', { name: /color presets/i });
      const presetRadios = presetsGroup.querySelectorAll('input[type="radio"]');

      expect(presetRadios.length).toBeGreaterThan(0);
      presetRadios.forEach(radio => {
        expect(radio).toHaveAttribute('aria-label');
        expect(radio.getAttribute('aria-label')).toMatch(/select .* theme/i);
      });
    });
  });
});
