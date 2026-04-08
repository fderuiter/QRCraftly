/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig, SocialFormat, TemplateStyle } from '../types';

describe('LayoutControls (via StyleControls)', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the Export Layout section heading', () => {
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Export Layout')).toBeInTheDocument();
  });

  it('renders aspect-ratio format buttons', () => {
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /Square format/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Portrait format/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Story format/i })).toBeInTheDocument();
  });

  it('renders template style buttons', () => {
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /None template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Minimalist template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gradient template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solid Frame template/i })).toBeInTheDocument();
  });

  it('calls onChange with STORY_9_16 when Story button is clicked', async () => {
    const user = userEvent.setup();
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Story format/i }));
    expect(mockOnChange).toHaveBeenCalledWith({ socialFormat: SocialFormat.STORY_9_16 });
  });

  it('calls onChange with PORTRAIT_4_5 when Portrait button is clicked', async () => {
    const user = userEvent.setup();
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Portrait format/i }));
    expect(mockOnChange).toHaveBeenCalledWith({ socialFormat: SocialFormat.PORTRAIT_4_5 });
  });

  it('calls onChange with MINIMALIST when Minimalist button is clicked', async () => {
    const user = userEvent.setup();
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Minimalist template/i }));
    expect(mockOnChange).toHaveBeenCalledWith({ templateStyle: TemplateStyle.MINIMALIST });
  });

  it('does NOT show text inputs when templateStyle is NONE', () => {
    render(<StyleControls config={DEFAULT_CONFIG as QRConfig} onChange={mockOnChange} />);
    expect(screen.queryByRole('textbox', { name: /headline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /subtext/i })).not.toBeInTheDocument();
  });

  it('shows headline and subtext inputs when a template is active', () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    expect(screen.getByRole('textbox', { name: /headline/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /subtext/i })).toBeInTheDocument();
  });

  it('calls onChange with templateHeadline when headline input changes', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateHeadline: '',
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox', { name: /headline/i });
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateHeadline: 'Hello' });
  });

  it('calls onChange with templateSubtext when subtext input changes', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.SOLID_FRAME,
      templateSubtext: '',
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox', { name: /subtext/i });
    fireEvent.change(input, { target: { value: '@handle' } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateSubtext: '@handle' });
  });

  it('marks the currently active format button as pressed', () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      socialFormat: SocialFormat.STORY_9_16,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const storyBtn = screen.getByRole('button', { name: /Story format/i });
    expect(storyBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
