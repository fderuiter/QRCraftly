import { render, screen, fireEvent } from '@testing-library/react';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { describe, it, expect, vi } from 'vitest';

describe('StyleControls Range Value Display', () => {
  const mockOnChange = vi.fn();

  it('shows range values next to inputs', () => {
    const config = {
        ...DEFAULT_CONFIG,
        isBorderEnabled: true,
        borderSize: 0.05,
        logoUrl: 'data:image/png;base64,fake',
        logoSize: 0.2,
        logoPadding: 1
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    // Default border size is 0.05 -> "5.0%"
    expect(screen.getByText('5.0%')).toBeInTheDocument();

    // Default logo size is 0.2 -> "20%"
    expect(screen.getByText('20%')).toBeInTheDocument();

    // Default logo padding is 1 -> "1.0"
    expect(screen.getByText('1.0')).toBeInTheDocument();
  });

  it('calls onChange with correct values when range inputs are changed', () => {
    const config = {
        ...DEFAULT_CONFIG,
        isBorderEnabled: true,
        logoUrl: 'data:image/png;base64,fake',
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    const borderInput = screen.getByLabelText('Width');
    fireEvent.change(borderInput, { target: { value: '0.1' } });
    expect(mockOnChange).toHaveBeenCalledWith({ borderSize: 0.1 });

    const logoSizeInput = screen.getByLabelText('Logo Size');
    fireEvent.change(logoSizeInput, { target: { value: '0.25' } });
    expect(mockOnChange).toHaveBeenCalledWith({ logoSize: 0.25 });

    const paddingInput = screen.getByLabelText('Padding');
    fireEvent.change(paddingInput, { target: { value: '2.5' } });
    expect(mockOnChange).toHaveBeenCalledWith({ logoPadding: 2.5 });
  });
});
