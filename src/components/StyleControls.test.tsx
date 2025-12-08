import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle, LogoPaddingStyle } from '../types';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

describe('StyleControls Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders pattern options', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);
    expect(screen.getByText(/Standard Industrial/)).toBeInTheDocument();
    expect(screen.getByText(/Modern Soft/)).toBeInTheDocument();
    expect(screen.getByText(/Swiss Dot/)).toBeInTheDocument();
  });

  it('changes pattern style', async () => {
    const user = userEvent.setup();
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Clicking the "Swiss Dot" pattern button
    const dotsButton = screen.getByText(/Swiss Dot/);
    await user.click(dotsButton);

    expect(mockOnChange).toHaveBeenCalledWith({ style: QRStyle.SWISS });
  });

  it('renders pattern preview icons for all styles', () => {
     const { container } = render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

     // Starburst should have an SVG
     // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
     const starPath = container.querySelector('path[d^="M12 2l3.09 6.26"]');
     expect(starPath).toBeInTheDocument();

     // Hive uses clipPath
     // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
     const hiveElements = container.querySelectorAll('div[style*="polygon(50% 0%"]');
     expect(hiveElements.length).toBeGreaterThan(0);
  });

  it('updates colors via inputs', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    const fgInput = screen.getByLabelText('Foreground');
    fireEvent.change(fgInput, { target: { value: '#ff0000' } });
    expect(mockOnChange).toHaveBeenCalledWith({ fgColor: '#ff0000' });

    const bgInput = screen.getByLabelText('Background');
    fireEvent.change(bgInput, { target: { value: '#00ff00' } });
    expect(mockOnChange).toHaveBeenCalledWith({ bgColor: '#00ff00' });

    const eyeInput = screen.getByLabelText('Eye Color (Corners)');
    fireEvent.change(eyeInput, { target: { value: '#0000ff' } });
    expect(mockOnChange).toHaveBeenCalledWith({ eyeColor: '#0000ff' });
  });

  it('updates colors via preset buttons', async () => {
    const user = userEvent.setup();
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    const presetButtons = screen.getAllByRole('button', { name: /Classic|Slate|Teal Brand|Royal Blue|Midnight|Forest|Rose|Purple|Cyber/i });
    if (presetButtons.length > 0) {
        await user.click(presetButtons[1]);
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
            fgColor: expect.any(String),
            bgColor: expect.any(String),
            eyeColor: expect.any(String),
        }));
    }
  });

  it('shows low contrast warning', () => {
    // Low contrast config: white text on white background
    const lowContrastConfig = { ...DEFAULT_CONFIG, fgColor: '#ffffff', bgColor: '#ffffff' };
    render(<StyleControls config={lowContrastConfig} onChange={mockOnChange} />);

    expect(screen.getByText(/Low Contrast/)).toBeInTheDocument();
    expect(screen.getByText(/Warning: The contrast ratio is low/)).toBeInTheDocument();
  });

  it('hides low contrast warning when contrast is good', () => {
    const highContrastConfig = { ...DEFAULT_CONFIG, fgColor: '#000000', bgColor: '#ffffff' };
    render(<StyleControls config={highContrastConfig} onChange={mockOnChange} />);

    expect(screen.queryByText(/Low Contrast/)).not.toBeInTheDocument();
  });

  it('renders logo upload section', () => {
      render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);
      expect(screen.getByText('Upload Logo')).toBeInTheDocument();
  });

  it('handles logo upload', async () => {
      const user = userEvent.setup();
      const { container } = render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

      const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInput = container.querySelector('input[type="file"]');

      const originalFileReader = global.FileReader;
      const mockFileReader = class {
          onload: any;
          readAsDataURL() {
             setTimeout(() => {
                 this.onload({ target: { result: 'data:image/png;base64,mocklogo' } });
             }, 0);
          }
      } as any;
      global.FileReader = mockFileReader;

      if (fileInput) {
          await user.upload(fileInput as HTMLElement, file);
          await waitFor(() => {
              expect(mockOnChange).toHaveBeenCalledWith({ logoUrl: 'data:image/png;base64,mocklogo' });
          });
      } else {
        throw new Error('File input not found');
      }
      global.FileReader = originalFileReader;
  });

  it('renders logo settings when logo is present', async () => {
    const user = userEvent.setup();
    const logoConfig = { ...DEFAULT_CONFIG, logoUrl: 'data:image/png;base64,fake' };
    render(<StyleControls config={logoConfig} onChange={mockOnChange} />);

    expect(screen.getByText('Custom Logo')).toBeInTheDocument();

    const removeButton = screen.getByText('Remove');
    await user.click(removeButton);
    expect(mockOnChange).toHaveBeenCalledWith({ logoUrl: null });
  });

  it('changes logo padding style', async () => {
      const user = userEvent.setup();
      const logoConfig = { ...DEFAULT_CONFIG, logoUrl: 'data:image/png;base64,fake', logoPaddingStyle: 'square' as LogoPaddingStyle };
      render(<StyleControls config={logoConfig} onChange={mockOnChange} />);

      const circleBtn = screen.getByRole('button', { name: 'Circle' });
      await user.click(circleBtn);
      expect(mockOnChange).toHaveBeenCalledWith({ logoPaddingStyle: 'circle' });

      const noneBtn = screen.getByRole('button', { name: 'None' });
      await user.click(noneBtn);
      expect(mockOnChange).toHaveBeenCalledWith({ logoPaddingStyle: 'none' });
  });

  it('updates logo sliders and colors', () => {
      const logoConfig = { ...DEFAULT_CONFIG, logoUrl: 'data:image/png;base64,fake', logoPaddingStyle: 'square' as LogoPaddingStyle };
      render(<StyleControls config={logoConfig} onChange={mockOnChange} />);

      const paddingInput = screen.getByLabelText('Padding');
      fireEvent.change(paddingInput, { target: { value: '2' } });
      expect(mockOnChange).toHaveBeenCalledWith({ logoPadding: 2 });

      const sizeInput = screen.getByLabelText('Logo Size');
      fireEvent.change(sizeInput, { target: { value: '0.25' } });
      expect(mockOnChange).toHaveBeenCalledWith({ logoSize: 0.25 });

      const bgInput = screen.getByLabelText('Background Color');
      fireEvent.change(bgInput, { target: { value: '#123456' } });
      expect(mockOnChange).toHaveBeenCalledWith({ logoBackgroundColor: '#123456' });
  });

  it('hides padding and background color controls when logo padding style is none', () => {
      const logoConfig = { ...DEFAULT_CONFIG, logoUrl: 'data:image/png;base64,fake', logoPaddingStyle: 'none' as LogoPaddingStyle };
      render(<StyleControls config={logoConfig} onChange={mockOnChange} />);

      expect(screen.queryByLabelText('Padding')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Background Color')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Logo Size')).toBeInTheDocument();
  });
});
