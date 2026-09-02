/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: Framework AGPL
*/

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { LogoControls } from './LogoControls';
import { createTestConfig, createMockOnChange } from './testUtils';
import * as security from '../../utils/security';
import * as imageResizeHelper from '../../utils/imageResizeHelper';

describe('LogoControls Subcomponent', () => {

  const mockOnChange = createMockOnChange();

  beforeEach(() => {
    mockOnChange.mockClear();
    vi.spyOn(security, 'validateImageUpload').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Upload Logo button when logoUrl is null and opens file dialog on click', async () => {
    const user = userEvent.setup();
    const config = createTestConfig({ logoUrl: null });
    const { container } = render(<LogoControls config={config} onChange={mockOnChange} />);

    const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
    expect(uploadButton).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const clickSpy = vi.spyOn(fileInput, 'click');
    await user.click(uploadButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('processes image file upload and dispatches logoUrl update', async () => {
    const user = userEvent.setup();
    vi.spyOn(imageResizeHelper, 'isLowTierDevice').mockReturnValue(false);
    vi.spyOn(imageResizeHelper, 'isOffThreadSupported').mockReturnValue(true);
    vi.spyOn(imageResizeHelper, 'processImageOffThread').mockResolvedValue('data:image/webp;base64,optimizedLogo');

    const config = createTestConfig({ logoUrl: null });
    const { container } = render(<LogoControls config={config} onChange={mockOnChange} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy logo'], 'logo.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({ logoUrl: 'data:image/webp;base64,optimizedLogo' });
    });
  });

  it('displays error message alert when image upload validation fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(security, 'validateImageUpload').mockReturnValue('Image exceeds maximum file size limit of 2MB.');

    const config = createTestConfig({ logoUrl: null });
    const { container } = render(<LogoControls config={config} onChange={mockOnChange} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(['oversized content'], 'huge.png', { type: 'image/png' });

    await user.upload(fileInput, largeFile);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Image exceeds maximum file size limit of 2MB.');
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('renders active logo controls card when logoUrl is provided', () => {
    const config = createTestConfig({
      logoUrl: 'data:image/png;base64,testLogo',
      logoPaddingStyle: 'square',
      logoPadding: 1,
      logoBackgroundColor: '#ffffff',
      logoSize: 0.2,
    });

    render(<LogoControls config={config} onChange={mockOnChange} />);

    expect(screen.getByAltText('Custom Brand Graphic')).toBeInTheDocument();
    expect(screen.getByText('Custom Logo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();

    // Border Style radiogroup
    expect(screen.getByRole('radiogroup', { name: 'Border Style' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Set logo border style to Square' })).toBeChecked();
  });

  it('conditionally hides Padding and Background Color controls when logoPaddingStyle is "none"', () => {
    const squareConfig = createTestConfig({
      logoUrl: 'data:image/png;base64,testLogo',
      logoPaddingStyle: 'square',
      logoPadding: 1.5,
      logoBackgroundColor: '#ffffff',
    });

    const { rerender } = render(<LogoControls config={squareConfig} onChange={mockOnChange} />);

    // Padding and Background Color controls present for 'square'
    expect(screen.getByLabelText('Padding')).toBeInTheDocument();
    expect(screen.getByLabelText('Background Color')).toBeInTheDocument();

    const noneConfig = createTestConfig({
      logoUrl: 'data:image/png;base64,testLogo',
      logoPaddingStyle: 'none',
    });

    rerender(<LogoControls config={noneConfig} onChange={mockOnChange} />);

    // Padding and Background Color controls hidden for 'none'
    expect(screen.queryByLabelText('Padding')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Background Color')).not.toBeInTheDocument();

    // Logo Size remains visible
    expect(screen.getByLabelText('Logo Size')).toBeInTheDocument();
  });

  it('dispatches configuration updates when changing border style, padding, color, and logo size', async () => {
    const user = userEvent.setup();
    const config = createTestConfig({
      logoUrl: 'data:image/png;base64,testLogo',
      logoPaddingStyle: 'square',
      logoPadding: 1,
      logoBackgroundColor: '#ffffff',
      logoSize: 0.2,
    });

    render(<LogoControls config={config} onChange={mockOnChange} />);

    // Change Border Style to Circle
    const circleRadio = screen.getByRole('radio', { name: 'Set logo border style to Circle' });
    await user.click(circleRadio);
    expect(mockOnChange).toHaveBeenCalledWith({ logoPaddingStyle: 'circle' });

    mockOnChange.mockClear();

    // Change Padding slider
    const paddingInput = screen.getByLabelText('Padding');
    fireEvent.change(paddingInput, { target: { value: '2.5' } });
    expect(mockOnChange).toHaveBeenCalledWith({ logoPadding: 2.5 });

    mockOnChange.mockClear();

    // Change Background Color
    const colorInput = screen.getByLabelText('Background Color');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(mockOnChange).toHaveBeenCalledWith({ logoBackgroundColor: '#ff0000' });

    mockOnChange.mockClear();

    // Change Logo Size
    const sizeInput = screen.getByLabelText('Logo Size');
    fireEvent.change(sizeInput, { target: { value: '0.25' } });
    expect(mockOnChange).toHaveBeenCalledWith({ logoSize: 0.25 });
  });

  it('restores focus to Upload Logo button after logo removal', async () => {
    const user = userEvent.setup();

    const configWithLogo = createTestConfig({ logoUrl: 'data:image/png;base64,testLogo' });
    const { rerender } = render(<LogoControls config={configWithLogo} onChange={mockOnChange} />);

    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith({ logoUrl: null });

    // Rerender component with logoUrl = null
    const configWithoutLogo = createTestConfig({ logoUrl: null });
    rerender(<LogoControls config={configWithoutLogo} onChange={mockOnChange} />);

    const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });

    await waitFor(() => {
      expect(uploadButton).toHaveFocus();
    });
  });

  it('passes automated accessibility scans without violations', async () => {
    const configWithoutLogo = createTestConfig({ logoUrl: null });
    const { container, rerender } = render(<LogoControls config={configWithoutLogo} onChange={mockOnChange} />);

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    const configWithLogo = createTestConfig({ logoUrl: 'data:image/png;base64,testLogo', logoPaddingStyle: 'circle' });
    rerender(<LogoControls config={configWithLogo} onChange={mockOnChange} />);

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
