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
import { describe, it, expect, vi } from 'vitest';
import Page from './+Page';

describe('QR Damage Simulator Game Page', () => {
  it('renders the game page layout and headers', () => {
    render(<Page />);

    // Check primary page headings
    expect(screen.getByRole('heading', { level: 1, name: /QR Analytical Module-Damage Simulator/i })).toBeInTheDocument();
    expect(screen.getByText(/Interactive playground mapping physical screen blast coordinates/i)).toBeInTheDocument();
  });

  it('renders target customizer and weapon selectors', () => {
    render(<Page />);

    // Check customize headers
    expect(screen.getByRole('heading', { name: /1\. Customize Target QR/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /QR Data Payload/i })).toBeInTheDocument();

    // Check weapon selectors
    expect(screen.getByRole('heading', { name: /2\. Select Blast Weapon/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Pinpoint Laser/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Plasma Charge/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Neutron Blast/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Thermonuclear Nuke/i })).toBeInTheDocument();
  });

  it('renders interactive canvas and action buttons', () => {
    render(<Page />);

    // Check canvas and help labels
    const canvas = screen.getByLabelText(/Interactive QR Code Game Board/i);
    expect(canvas).toBeInTheDocument();

    // Check button elements
    expect(screen.getByRole('button', { name: /Reset Grid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Artillery Barrage/i })).toBeInTheDocument();
  });

  it('allows customizing target text and error correction levels', () => {
    render(<Page />);

    const input = screen.getByRole('textbox', { name: /QR Data Payload/i });
    fireEvent.change(input, { target: { value: 'https://github.com' } });
    expect(input).toHaveValue('https://github.com');

    // Click Level H error correction level
    const levelHButton = screen.getByRole('button', { name: /Level H/i });
    fireEvent.click(levelHButton);
    expect(levelHButton).toHaveClass('bg-teal-600');
  });

  it('allows weapon selection', () => {
    render(<Page />);

    const nukeButton = screen.getByRole('radio', { name: /Thermonuclear Nuke/i });
    fireEvent.click(nukeButton);
    expect(nukeButton).toHaveAttribute('aria-checked', 'true');
  });

  it('allows firing a barrage of artillery', () => {
    render(<Page />);

    const resetBtn = screen.getByRole('button', { name: /Reset Grid/i });
    expect(resetBtn).toBeDisabled();

    const barrageBtn = screen.getByRole('button', { name: /Artillery Barrage/i });
    fireEvent.click(barrageBtn);

    // After barrage, reset grid should be active (since modules were damaged)
    expect(resetBtn).not.toBeDisabled();

    // Resetting should disable the button again
    fireEvent.click(resetBtn);
    expect(resetBtn).toBeDisabled();
  });

  it('triggers Finder Subsystem Offline alert and 0% health when corner finder pattern is damaged', () => {
    render(<Page />);

    const canvas = screen.getByLabelText(/Interactive QR Code Game Board/i);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 512,
      height: 512,
      right: 512,
      bottom: 512,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    // Select Thermonuclear Nuke to hit top-left corner finder pattern
    const nukeBtn = screen.getByRole('radio', { name: /Thermonuclear Nuke/i });
    fireEvent.click(nukeBtn);

    // Initial scan health should be 100%
    expect(screen.getByText(/100% Remaining/i)).toBeInTheDocument();

    // Fire blast at top-left corner (x=10, y=10) targeting finder eye
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });

    // HUD health should drop immediately to 0% Remaining
    expect(screen.getByText(/0% Remaining/i)).toBeInTheDocument();

    // HUD alert text should dynamically report Finder Subsystem Offline
    expect(screen.getAllByText(/Finder Subsystem Offline/i).length).toBeGreaterThan(0);
  });

  it('triggers Block Budget Exceeded alert when localized virtual block error limit is breached', () => {
    render(<Page />);

    const canvas = screen.getByLabelText(/Interactive QR Code Game Board/i);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 512,
      height: 512,
      right: 512,
      bottom: 512,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    // Select Level L error correction (budget ~7 modules per block)
    const levelLBtn = screen.getByRole('button', { name: /Level L/i });
    fireEvent.click(levelLBtn);

    // Select Thermonuclear Nuke weapon (radius 4)
    const nukeBtn = screen.getByRole('radio', { name: /Thermonuclear Nuke/i });
    fireEvent.click(nukeBtn);

    // Fire nuke blast at center data area (x=256, y=256, row=10, col=10)
    fireEvent.mouseDown(canvas, { clientX: 256, clientY: 256 });

    // Health should drop to 0% when local block budget is exceeded
    expect(screen.getByText(/0% Remaining/i)).toBeInTheDocument();

    // Alert should dynamically update to Block Budget Exceeded
    expect(screen.getAllByText(/Block Budget Exceeded/i).length).toBeGreaterThan(0);
  });
});
