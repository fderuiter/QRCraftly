import { render, screen, fireEvent } from '@testing-library/react';
import { PatternControls } from './style-controls/PatternControls';
import { ColorControls } from './style-controls/ColorControls';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
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

    it('renders persistent visually-hidden polite live region for scannability warnings', () => {
      const handleChange = vi.fn();
      // Test standard pattern (no warning expected in live region)
      const { rerender } = render(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);

      const liveRegion = screen.getByText((content, element) => {
        return element?.className === 'sr-only' && element?.getAttribute('aria-live') === 'polite';
      });
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toBeEmptyDOMElement();

      // Test low-reliability pattern (warning expected in live region)
      const lowReliabilityConfig = {
        ...DEFAULT_CONFIG,
        style: QRStyle.GRUNGE,
      };
      rerender(<PatternControls config={lowReliabilityConfig} onChange={handleChange} />);
      expect(liveRegion).not.toBeEmptyDOMElement();
      expect(liveRegion).toHaveTextContent(/Scannability Warning: The selected pattern \("Grunge"\) is complex and may reduce scannability/);

      // Test another low-reliability pattern
      const circuitConfig = {
        ...DEFAULT_CONFIG,
        style: QRStyle.CIRCUIT,
      };
      rerender(<PatternControls config={circuitConfig} onChange={handleChange} />);
      expect(liveRegion).toHaveTextContent(/Scannability Warning: The selected pattern \("Cyber Circuit"\) is complex and may reduce scannability/);

      // Test switching back to high-reliability pattern (warning cleared from live region)
      rerender(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);
      expect(liveRegion).toBeEmptyDOMElement();
    });

    it('shows or hides the Adaptive Geometric Compensation toggle based on selected pattern style', () => {
      const handleChange = vi.fn();
      
      // Standard style selected: toggle should not be in the document
      const { rerender } = render(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);
      expect(screen.queryByLabelText(/Enable Adaptive Geometric Compensation/i)).not.toBeInTheDocument();

      // Swiss style selected: toggle should be visible
      const swissConfig = { ...DEFAULT_CONFIG, style: QRStyle.SWISS };
      rerender(<PatternControls config={swissConfig} onChange={handleChange} />);
      const toggle = screen.getByLabelText(/Enable Adaptive Geometric Compensation/i);
      expect(toggle).toBeInTheDocument();

      // Toggling it should call onChange
      fireEvent.click(toggle);
      expect(handleChange).toHaveBeenCalledWith({ isCompensationEnabled: true });

      // Starburst style selected: toggle should be visible
      const starburstConfig = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      rerender(<PatternControls config={starburstConfig} onChange={handleChange} />);
      expect(screen.getByLabelText(/Enable Adaptive Geometric Compensation/i)).toBeInTheDocument();
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
