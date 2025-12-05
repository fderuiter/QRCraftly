import { render, screen, fireEvent } from '@testing-library/react';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('StyleControls Component', () => {
  const mockOnChange = vi.fn();

  it('renders pattern options', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);
    expect(screen.getByText(/Squares/)).toBeInTheDocument();
    expect(screen.getByText(/Dots/)).toBeInTheDocument();
  });

  it('changes pattern style', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Clicking the "Dots" pattern button
    const dotsButton = screen.getByText(/Dots/);
    fireEvent.click(dotsButton);

    expect(mockOnChange).toHaveBeenCalledWith({ style: QRStyle.DOTS });
  });

  it('updates colors', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    const fgInput = screen.getByLabelText('Foreground');
    fireEvent.change(fgInput, { target: { value: '#ff0000' } });

    expect(mockOnChange).toHaveBeenCalledWith({ fgColor: '#ff0000' });
  });

  it('shows low contrast warning', () => {
    // Low contrast config: white text on white background
    const lowContrastConfig = { ...DEFAULT_CONFIG, fgColor: '#ffffff', bgColor: '#ffffff' };
    render(<StyleControls config={lowContrastConfig} onChange={mockOnChange} />);

    expect(screen.getByText(/Low Contrast/)).toBeInTheDocument();
    expect(screen.getByText(/Warning: The contrast ratio is low/)).toBeInTheDocument();
  });

  it('renders logo upload section', () => {
      render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);
      expect(screen.getByText('Upload Logo')).toBeInTheDocument();
  });

  it('renders logo settings when logo is present', () => {
    const logoConfig = { ...DEFAULT_CONFIG, logoUrl: 'data:image/png;base64,fake' };
    render(<StyleControls config={logoConfig} onChange={mockOnChange} />);

    expect(screen.getByText('Custom Logo')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(screen.getByLabelText('Padding')).toBeInTheDocument();
    expect(screen.getByLabelText('Logo Size')).toBeInTheDocument();
  });
});
