/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: Framework AGPL
*/

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { AdvancedControls } from './AdvancedControls';
import { createTestConfig, createMockOnChange } from './testUtils';
import { QRErrorCorrectionLevel } from '../../types';

describe('AdvancedControls Subcomponent', () => {
  const mockOnChange = createMockOnChange();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders collapsed by default with correct ARIA attributes', () => {
    const config = createTestConfig();
    render(<AdvancedControls config={config} onChange={mockOnChange} />);

    const toggleButton = screen.getByRole('button', { name: /Advanced Mode/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAttribute('aria-controls', 'advanced-settings-panel');

    expect(screen.queryByRole('radiogroup', { name: 'Error Correction Level' })).not.toBeInTheDocument();
  });

  it('expands panel when Advanced Mode button is clicked', async () => {
    const user = userEvent.setup();
    const config = createTestConfig();
    render(<AdvancedControls config={config} onChange={mockOnChange} />);

    const toggleButton = screen.getByRole('button', { name: /Advanced Mode/i });
    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('radiogroup', { name: 'Error Correction Level' })).toBeInTheDocument();
  });

  it('allows selecting error correction levels and dispatches onChange updates', async () => {
    const user = userEvent.setup();
    const config = createTestConfig({ errorCorrectionLevel: QRErrorCorrectionLevel.M });
    render(<AdvancedControls config={config} onChange={mockOnChange} />);

    // Expand
    await user.click(screen.getByRole('button', { name: /Advanced Mode/i }));

    const highLevelRadio = screen.getByRole('radio', { name: /Set error correction level to High/i });
    expect(highLevelRadio).not.toBeChecked();

    await user.click(highLevelRadio);

    expect(mockOnChange).toHaveBeenCalledWith({ errorCorrectionLevel: QRErrorCorrectionLevel.H });
  });

  it('handles maze overlay toggle and conditionally renders maze configuration sub-controls', async () => {
    const user = userEvent.setup();
    const disabledConfig = createTestConfig({ isMazeEnabled: false });
    const { rerender } = render(<AdvancedControls config={disabledConfig} onChange={mockOnChange} />);

    // Expand
    await user.click(screen.getByRole('button', { name: /Advanced Mode/i }));

    // Maze sub-controls should not be present initially
    expect(screen.queryByLabelText('Finder Pattern Bridges')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Maze Path Width')).not.toBeInTheDocument();

    const mazeSwitch = screen.getByRole('switch', { name: /Playable Maze Overlay/i });
    await user.click(mazeSwitch);

    expect(mockOnChange).toHaveBeenCalledWith({ isMazeEnabled: true });

    // Rerender with maze enabled
    const enabledConfig = createTestConfig({
      isMazeEnabled: true,
      isMazeBridgesEnabled: true,
      mazePathWidth: 0.25,
      mazeColor: '#3b82f6',
      showMazeSolution: false,
    });
    rerender(<AdvancedControls config={enabledConfig} onChange={mockOnChange} />);

    // Sub-controls are now rendered
    expect(screen.getByRole('switch', { name: /Finder Pattern Bridges/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Maze Path Width')).toBeInTheDocument();
    expect(screen.getByLabelText('Maze Path Color')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Show Maze Solution/i })).toBeInTheDocument();
  });

  it('dispatches configuration updates when interacting with maze sub-controls', async () => {
    const user = userEvent.setup();
    const enabledConfig = createTestConfig({
      isMazeEnabled: true,
      isMazeBridgesEnabled: true,
      mazePathWidth: 0.25,
      mazeColor: '#3b82f6',
      showMazeSolution: false,
    });
    render(<AdvancedControls config={enabledConfig} onChange={mockOnChange} />);

    // Expand
    await user.click(screen.getByRole('button', { name: /Advanced Mode/i }));

    // Toggle bridges switch
    const bridgesSwitch = screen.getByRole('switch', { name: /Finder Pattern Bridges/i });
    await user.click(bridgesSwitch);
    expect(mockOnChange).toHaveBeenCalledWith({ isMazeBridgesEnabled: false });

    mockOnChange.mockClear();

    // Change maze color
    const mazeColorInput = screen.getByLabelText('Maze Path Color');
    fireEvent.change(mazeColorInput, { target: { value: '#ff0000' } });
    expect(mockOnChange).toHaveBeenCalledWith({ mazeColor: '#ff0000' });

    mockOnChange.mockClear();

    // Toggle show maze solution switch
    const solutionSwitch = screen.getByRole('switch', { name: /Show Maze Solution/i });
    await user.click(solutionSwitch);
    expect(mockOnChange).toHaveBeenCalledWith({ showMazeSolution: true });
  });

  it('passes automated accessibility scans without violations when collapsed and expanded', async () => {
    const config = createTestConfig({ isMazeEnabled: true });
    const { container } = render(<AdvancedControls config={config} onChange={mockOnChange} />);

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    // Expand
    fireEvent.click(screen.getByRole('button', { name: /Advanced Mode/i }));

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
