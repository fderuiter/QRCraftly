import { render, screen, fireEvent } from '@testing-library/react';
import QRTool from './QRTool';
import { describe, it, expect, vi } from 'vitest';

// Mock QRCanvas because it uses canvas which is hard to test in jsdom,
// and we want to test App logic not the library
vi.mock('./QRCanvas', () => ({
  default: () => <div data-testid="qr-canvas">QR Canvas</div>
}));

describe('QRTool Component', () => {
  it('renders without crashing', () => {
    render(<QRTool />);
    expect(screen.getByText('QRCraftly')).toBeInTheDocument();
    expect(screen.getByText('Design beautiful QR codes in seconds.')).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    render(<QRTool />);
    const toggleButton = screen.getByTitle('Switch to Dark Mode');

    // Initial state: light mode (no 'dark' class on container, but we check button state/effect)
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    // Check if the sun icon is now present (indicating we are in dark mode)
    expect(screen.getByTitle('Switch to Light Mode')).toBeInTheDocument();
  });

  it('renders InputPanel and StyleControls', () => {
    render(<QRTool />);
    // Check for section headers
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('renders Preview Area', () => {
    render(<QRTool />);
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
    expect(screen.getByTestId('qr-canvas')).toBeInTheDocument();
  });

  it('shows download menu when download button is clicked', () => {
    render(<QRTool />);
    const downloadBtn = screen.getByText('Download');
    fireEvent.click(downloadBtn);

    expect(screen.getByText('PNG (High Quality)')).toBeInTheDocument();
    expect(screen.getByText('JPEG (Compact)')).toBeInTheDocument();
    expect(screen.getByText('WebP (Modern)')).toBeInTheDocument();
  });
});
