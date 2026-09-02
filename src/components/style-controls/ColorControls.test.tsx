/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: Framework AGPL
*/

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { ColorControls } from './ColorControls';
import { createTestConfig, createMockOnChange } from './testUtils';
import { PRESET_COLORS } from '../../constants';

describe('ColorControls Subcomponent', () => {
  const mockOnChange = createMockOnChange();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders color preset options and color input controls', () => {
    const config = createTestConfig({ fgColor: '#000000', bgColor: '#ffffff', eyeColor: '#000000' });
    render(<ColorControls config={config} onChange={mockOnChange} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Colors' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Color Presets' })).toBeInTheDocument();

    PRESET_COLORS.forEach((preset) => {
      expect(screen.getByRole('radio', { name: `Select ${preset.label} theme` })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Foreground')).toBeInTheDocument();
    expect(screen.getByLabelText('Background')).toBeInTheDocument();
    expect(screen.getByLabelText('Eye Color (Corners)')).toBeInTheDocument();
  });

  it('triggers onChange with preset color set when selecting a color preset theme', async () => {
    const user = userEvent.setup();
    const config = createTestConfig({ fgColor: '#000000', bgColor: '#ffffff', eyeColor: '#000000' });
    render(<ColorControls config={config} onChange={mockOnChange} />);

    const targetPreset = PRESET_COLORS[1]; // Slate or second preset
    const presetRadio = screen.getByRole('radio', { name: `Select ${targetPreset.label} theme` });

    await user.click(presetRadio);

    expect(mockOnChange).toHaveBeenCalledWith({
      fgColor: targetPreset.fg,
      bgColor: targetPreset.bg,
      eyeColor: targetPreset.eye,
    });
  });

  it('triggers individual onChange updates when editing foreground, background, and eye colors', () => {
    const config = createTestConfig({ fgColor: '#000000', bgColor: '#ffffff', eyeColor: '#000000' });
    render(<ColorControls config={config} onChange={mockOnChange} />);

    const fgInput = screen.getByLabelText('Foreground');
    fireEvent.change(fgInput, { target: { value: '#123456' } });
    expect(mockOnChange).toHaveBeenCalledWith({ fgColor: '#123456' });

    mockOnChange.mockClear();

    const bgInput = screen.getByLabelText('Background');
    fireEvent.change(bgInput, { target: { value: '#f0f0f0' } });
    expect(mockOnChange).toHaveBeenCalledWith({ bgColor: '#f0f0f0' });

    mockOnChange.mockClear();

    const eyeInput = screen.getByLabelText('Eye Color (Corners)');
    fireEvent.change(eyeInput, { target: { value: '#654321' } });
    expect(mockOnChange).toHaveBeenCalledWith({ eyeColor: '#654321' });
  });

  it('displays low-contrast alert badge and banner when contrast falls below threshold and hides them when high', () => {
    // High contrast baseline (#000000 on #ffffff)
    const highContrastConfig = createTestConfig({ fgColor: '#000000', bgColor: '#ffffff', eyeColor: '#000000' });
    const { rerender } = render(<ColorControls config={highContrastConfig} onChange={mockOnChange} />);

    expect(screen.queryByText(/Low Contrast \(/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Low contrast configuration (#888888 on #888880)
    const lowContrastConfig = createTestConfig({ fgColor: '#888888', bgColor: '#888880', eyeColor: '#888888' });
    rerender(<ColorControls config={lowContrastConfig} onChange={mockOnChange} />);

    expect(screen.getByText(/Low Contrast \(/i)).toBeInTheDocument();
    const alertBanner = screen.getByRole('status');
    expect(alertBanner).toBeInTheDocument();
    expect(alertBanner).toHaveTextContent(/Warning: The contrast ratio is low/i);
  });

  it('updates contrast warning status dynamically upon prop update re-renders', () => {
    const lowContrastConfig = createTestConfig({ fgColor: '#777777', bgColor: '#777770', eyeColor: '#777777' });
    const { rerender } = render(<ColorControls config={lowContrastConfig} onChange={mockOnChange} />);

    expect(screen.getByText(/Low Contrast \(/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    const updatedHighContrastConfig = createTestConfig({ fgColor: '#000000', bgColor: '#ffffff', eyeColor: '#000000' });
    rerender(<ColorControls config={updatedHighContrastConfig} onChange={mockOnChange} />);

    expect(screen.queryByText(/Low Contrast \(/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('passes automated accessibility scans without violations', async () => {
    const highConfig = createTestConfig({ fgColor: '#000000', bgColor: '#ffffff', eyeColor: '#000000' });
    const { container, rerender } = render(<ColorControls config={highConfig} onChange={mockOnChange} />);

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    const lowConfig = createTestConfig({ fgColor: '#888888', bgColor: '#888880', eyeColor: '#888888' });
    rerender(<ColorControls config={lowConfig} onChange={mockOnChange} />);

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
