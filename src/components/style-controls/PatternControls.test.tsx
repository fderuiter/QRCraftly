/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: Framework AGPL
*/

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { PatternControls } from './PatternControls';
import { createTestConfig, createMockOnChange } from './testUtils';
import { PATTERNS, LOW_RELIABILITY_PATTERNS } from '../../constants';
import { QRStyle } from '../../types';

describe('PatternControls Subcomponent', () => {
  const mockOnChange = createMockOnChange();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders pattern style radiogroup with all pattern options', () => {
    const config = createTestConfig({ style: QRStyle.STANDARD });
    render(<PatternControls config={config} onChange={mockOnChange} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Pattern Style' })).toBeInTheDocument();

    const radiogroup = screen.getByRole('radiogroup', { name: 'Pattern Style' });
    expect(radiogroup).toBeInTheDocument();

    PATTERNS.forEach((pattern) => {
      const radio = screen.getByRole('radio', { name: `Select ${pattern.label} pattern` });
      expect(radio).toBeInTheDocument();
    });
  });

  it('visually highlights the active selected pattern option', () => {
    const config = createTestConfig({ style: QRStyle.MODERN });
    render(<PatternControls config={config} onChange={mockOnChange} />);

    const activeRadio = screen.getByRole('radio', { name: 'Select Modern Soft pattern' });
    expect(activeRadio).toBeChecked();

    const inactiveRadio = screen.getByRole('radio', { name: 'Select Standard Industrial pattern' });
    expect(inactiveRadio).not.toBeChecked();
  });

  it('triggers onChange callback with updated style when a pattern is selected', async () => {
    const user = userEvent.setup();
    const config = createTestConfig({ style: QRStyle.STANDARD });
    render(<PatternControls config={config} onChange={mockOnChange} />);

    const swissRadio = screen.getByRole('radio', { name: 'Select Swiss Dot pattern' });
    await user.click(swissRadio);

    expect(mockOnChange).toHaveBeenCalledWith({ style: QRStyle.SWISS });
  });

  it('renders low-reliability pattern warning for complex patterns and hides it for reliable ones', () => {
    const lowReliabilityStyle = LOW_RELIABILITY_PATTERNS[0];
    const lowReliabilityPatternLabel = PATTERNS.find((p) => p.id === lowReliabilityStyle)?.label;

    const lowConfig = createTestConfig({ style: lowReliabilityStyle });
    const { rerender } = render(<PatternControls config={lowConfig} onChange={mockOnChange} />);

    expect(screen.getByTestId('pattern-warning-slot')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`The selected pattern \\("${lowReliabilityPatternLabel}"\\) is complex`, 'i'))).toBeInTheDocument();

    const highConfig = createTestConfig({ style: QRStyle.STANDARD });
    rerender(<PatternControls config={highConfig} onChange={mockOnChange} />);

    expect(screen.queryByTestId('pattern-warning-slot')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes automated accessibility scans without violations', async () => {
    const standardConfig = createTestConfig({ style: QRStyle.STANDARD });
    const { container, rerender } = render(<PatternControls config={standardConfig} onChange={mockOnChange} />);

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    const grungeConfig = createTestConfig({ style: QRStyle.GRUNGE });
    rerender(<PatternControls config={grungeConfig} onChange={mockOnChange} />);

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
