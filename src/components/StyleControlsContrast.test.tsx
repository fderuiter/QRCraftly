
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig } from '../types';

describe('StyleControls Contrast Check', () => {
  const mockOnChange = vi.fn();

  it('shows contrast warning for border text', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: 'Low Contrast',
      borderTextColor: '#333333', // Dark Grey
      borderColor: '#303030', // Dark Grey (Low contrast)
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    expect(screen.getByText(/Low Contrast \(/)).toBeInTheDocument();
  });

  it('does not show warning for good contrast', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: 'High Contrast',
      borderTextColor: '#ffffff', // White
      borderColor: '#000000', // Black
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    expect(screen.queryByText(/Low Contrast \(/)).not.toBeInTheDocument();
  });

  it('does not show warning if no text', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: '', // No text
      borderTextColor: '#333333',
      borderColor: '#303030',
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    // Might match the other warning (main QR contrast), so we need to be specific or assume standard config has good contrast
    // DEFAULT_CONFIG has good contrast for main QR.
    expect(screen.queryByText(/Low Contrast \(/)).not.toBeInTheDocument();
  });
});
