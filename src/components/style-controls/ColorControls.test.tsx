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
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColorControls } from './ColorControls';
import { DEFAULT_CONFIG } from '../../constants';

describe('ColorControls', () => {
  it('renders with correct accessibility attributes', () => {
    const handleChange = vi.fn();
    render(<ColorControls config={DEFAULT_CONFIG} onChange={handleChange} />);

    // Check group role and label
    const group = screen.getByRole('radiogroup', { name: /color presets/i });
    expect(group).toBeInTheDocument();

    // Check preset radios have aria-labels
    // Note: ColorControls renders other buttons/inputs too, so we filter by the preset group
    // Ideally we query within the group
    const presetsGroup = screen.getByRole('radiogroup', { name: /color presets/i });
    const presetRadios = presetsGroup.querySelectorAll('input[type="radio"]');

    expect(presetRadios.length).toBeGreaterThan(0);
    presetRadios.forEach(radio => {
      expect(radio).toHaveAttribute('aria-label');
      expect(radio.getAttribute('aria-label')).toMatch(/select .* theme/i);
    });
  });
});
