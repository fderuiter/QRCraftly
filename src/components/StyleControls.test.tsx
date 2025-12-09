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

  // --- NEW TESTS FOR IMPROVED COVERAGE ---

  it('toggles advanced mode and changes error correction level', async () => {
      const user = userEvent.setup();
      render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

      const advancedBtn = screen.getByText('Advanced Mode');
      await user.click(advancedBtn);

      expect(screen.getByText('Error Correction Level')).toBeInTheDocument();

      const lowLevelBtn = screen.getByText('Low (~7%)');
      await user.click(lowLevelBtn);

      expect(mockOnChange).toHaveBeenCalledWith({ errorCorrectionLevel: 'L' });
  });

  it('toggles border visibility', async () => {
      const user = userEvent.setup();
      render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

      // Find the border checkbox. It's an input with type="checkbox" in the "Border" section.
      // We can find it by associating with the section or just find the first checkbox if it's the only one,
      // but there might be others.
      // The label has className="sr-only peer".

      const borderCheckbox = screen.getAllByRole('checkbox')[0]; // Assuming it's the first one, or refine selector
      await user.click(borderCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({ isBorderEnabled: !DEFAULT_CONFIG.isBorderEnabled });
  });

  it('updates border style, width, and color', async () => {
     const borderConfig = { ...DEFAULT_CONFIG, isBorderEnabled: true };
     render(<StyleControls config={borderConfig} onChange={mockOnChange} />);

     const styleSelect = screen.getByLabelText('Style');
     fireEvent.change(styleSelect, { target: { value: 'dashed' } });
     expect(mockOnChange).toHaveBeenCalledWith({ borderStyle: 'dashed' });

     const widthInput = screen.getByLabelText('Width');
     fireEvent.change(widthInput, { target: { value: '0.1' } });
     expect(mockOnChange).toHaveBeenCalledWith({ borderSize: 0.1 });

     const colorInput = screen.getByLabelText('Border Color');
     fireEvent.change(colorInput, { target: { value: '#ff00ff' } });
     expect(mockOnChange).toHaveBeenCalledWith({ borderColor: '#ff00ff' });
  });

  it('updates border text configuration', async () => {
      const borderConfig = { ...DEFAULT_CONFIG, isBorderEnabled: true };
      render(<StyleControls config={borderConfig} onChange={mockOnChange} />);

      const textInput = screen.getByPlaceholderText('Text on border...');
      fireEvent.change(textInput, { target: { value: 'Scan Me' } });
      expect(mockOnChange).toHaveBeenCalledWith({ borderText: 'Scan Me' });

      // Select for text position (combobox)
      const positionSelect = screen.getAllByRole('combobox').find(e => (e as HTMLSelectElement).value === 'bottom-center' || (e as HTMLSelectElement).value === 'top-center');
      if (positionSelect) {
         fireEvent.change(positionSelect, { target: { value: 'top-center' } });
         expect(mockOnChange).toHaveBeenCalledWith({ borderTextPosition: 'top-center' });
      }

      const textColorInput = screen.getByTitle('Text Color');
      fireEvent.change(textColorInput, { target: { value: '#112233' } });
      expect(mockOnChange).toHaveBeenCalledWith({ borderTextColor: '#112233' });
  });

  it('handles border logo upload and removal', async () => {
      const user = userEvent.setup();
      const borderConfig = { ...DEFAULT_CONFIG, isBorderEnabled: true };
      const { container } = render(<StyleControls config={borderConfig} onChange={mockOnChange} />);

      // Mock FileReader
      const originalFileReader = global.FileReader;
      const mockFileReader = class {
          onload: any;
          readAsDataURL() {
             setTimeout(() => {
                 this.onload({ target: { result: 'data:image/png;base64,borderlogo' } });
             }, 0);
          }
      } as any;
      global.FileReader = mockFileReader;

      // Click "Add Logo" or "Change" - trigger file input interaction
      // The button clicks the hidden input ref. We can just interact with the input directly for testing.
      // There are two file inputs now. The border one is the second one.
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInputs = container.querySelectorAll('input[type="file"]');
      // The first file input is the main logo, the second is the border logo
      // Wait, let's verify if that's guaranteed.
      // Yes, in StyleControls, Logo section is rendered after Border section in DOM order?
      // Wait, no. Border section is at the TOP.
      // <div className="space-y-8">
      //    {/* Border Controls */}
      //    ...
      //    {/* Pattern Style */}
      //    ...
      //    {/* Colors */}
      //    ...
      //    {/* Logo */}

      // So Border section comes first.
      // However, the main logo input `fileInputRef` is rendered at the end of the Logo section.
      // The border logo input `borderLogoInputRef` is rendered inside the Border section.
      // So Border logo input should be the FIRST file input in the DOM if Border is enabled.

      // But wait, the previous test might have assumed Main Logo is first?
      // Let's check `handles logo upload` test. It does:
      // const fileInput = container.querySelector('input[type="file"]');
      // If border is disabled (default config), then there is only one file input (Main Logo).

      // In THIS test, `isBorderEnabled: true`.
      // So there are two inputs.
      // 1. Border Logo Input (inside Border section)
      // 2. Main Logo Input (inside Logo section)

      // So fileInputs[0] should be border logo input.
      const borderLogoInput = fileInputs[0];

      const file = new File(['foo'], 'border.png', { type: 'image/png' });
      await user.upload(borderLogoInput as HTMLElement, file);

      await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith({ borderLogoUrl: 'data:image/png;base64,borderlogo' });
      });

      global.FileReader = originalFileReader;
  });

  it('updates border logo position and removes it', async () => {
      const user = userEvent.setup();
      const borderConfig = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderLogoUrl: 'data:fake' };
      render(<StyleControls config={borderConfig} onChange={mockOnChange} />);

      // Should show 'No secondary logo' text if null, but here it is present
      // Find position select.
      // It appears when logo is present.
      const positionSelects = screen.getAllByRole('combobox');
      // The last one likely, or find by value options
      // option value="bottom-right"
      const borderLogoPosSelect = positionSelects.find(s => s.innerHTML.includes('Bottom Right'));

      if (borderLogoPosSelect) {
         fireEvent.change(borderLogoPosSelect, { target: { value: 'bottom-right' } });
         expect(mockOnChange).toHaveBeenCalledWith({ borderLogoPosition: 'bottom-right' });
      }

      // Remove button (X icon)
      // It's a button with an X icon next to the logo preview
      const removeBtns = screen.getAllByRole('button');
      // Find the one that calls onChange({ borderLogoUrl: null })
      // It has className text-rose-600
      // We can just click the one inside the border section
      // The text is visually hidden maybe? No, it has an X icon.
      // Let's rely on class or structure if text is not available.
      // Actually, looking at code: <button ...><X .../></button> inside the border section.
      // There is no text.
      // But there is another remove button for main logo which has "Remove" text.
      // The border one doesn't have text.

      // We can find it by looking for the image alt "Border Logo" and finding the button sibling?
      const borderLogoImg = screen.getByAltText('Border Logo');
      // eslint-disable-next-line testing-library/no-node-access
      const removeBtn = borderLogoImg.nextElementSibling as HTMLElement;
      if (removeBtn) {
          await user.click(removeBtn);
          expect(mockOnChange).toHaveBeenCalledWith({ borderLogoUrl: null });
      }
  });
});
