import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StyleControls from '../StyleControls';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig } from '../../types';

describe('BorderControls Accessibility and Layout', () => {
  const mockOnChange = vi.fn();

  it('renders permanently visible label above border text input and does not use placeholder as replacement', () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: 'My Border Text',
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    // Renders permanently visible label above the input
    const textLabel = screen.getByText('Border Text');
    expect(textLabel).toBeInTheDocument();
    expect(textLabel.tagName).toBe('LABEL');

    // Input element is associated with the label and has correct placeholder
    const inputElement = screen.getByLabelText('Border Text');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('placeholder', 'Text on border...');
    expect(inputElement).toHaveValue('My Border Text');
  });

  it('renders visible labels for position selector and color inputs instead of hidden styling or tooltips', () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: 'My Border Text',
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    // Position selector field has a visible label
    const positionLabel = screen.getByText('Position');
    expect(positionLabel).toBeInTheDocument();
    expect(positionLabel.tagName).toBe('LABEL');
    expect(positionLabel).not.toHaveClass('sr-only');

    // Text Color input has a visible label
    const textColorLabel = screen.getByText('Text Color');
    expect(textColorLabel).toBeInTheDocument();
    expect(textColorLabel.tagName).toBe('LABEL');
    expect(textColorLabel).not.toHaveClass('sr-only');
  });

  it('displays legibility helper description dynamically below color inputs based on contrast', () => {
    // 1. High contrast combination (white text on dark border color) -> banner should not be visible
    const highContrastConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: 'Hello',
      borderTextColor: '#ffffff',
      borderColor: '#000000',
    };

    const { rerender } = render(<StyleControls config={highContrastConfig} onChange={mockOnChange} />);
    expect(screen.queryByText(/The contrast ratio between the layout's text and background is low/i)).not.toBeInTheDocument();

    // 2. Low contrast combination (dark grey text on dark grey border color) -> banner should display
    const lowContrastConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: 'Hello',
      borderTextColor: '#333333',
      borderColor: '#343434',
    };

    rerender(<StyleControls config={lowContrastConfig} onChange={mockOnChange} />);
    expect(screen.getByText(/The contrast ratio between the layout's text and background is low/i)).toBeInTheDocument();
  });
});
