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
import { PatternControls } from './PatternControls';
import { DEFAULT_CONFIG } from '../../constants';
import { QRStyle } from '../../types';

describe('PatternControls', () => {
  it('renders with correct accessibility attributes', () => {
    const handleChange = vi.fn();
    render(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);

    // Check group role and label
    const group = screen.getByRole('radiogroup', { name: /pattern style/i });
    expect(group).toBeInTheDocument();

    // Check radios have aria-labels
    const radios = screen.getAllByRole('radio');
    radios.forEach(radio => {
      expect(radio).toHaveAttribute('aria-label');
      expect(radio.getAttribute('aria-label')).toMatch(/select .* pattern/i);
    });

    // Check checked state
    const standardRadio = screen.getByLabelText(/select standard industrial pattern/i);
    expect(standardRadio).toBeChecked();
  });

  it('announces scannability warnings through one alert', () => {
    const handleChange = vi.fn();
    const { rerender } = render(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const lowReliabilityConfig = {
      ...DEFAULT_CONFIG,
      style: QRStyle.GRUNGE,
    };
    rerender(<PatternControls config={lowReliabilityConfig} onChange={handleChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Scannability Warning: The selected pattern \("Grunge"\) is complex and may reduce scannability/);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(document.querySelector('[aria-live]')).not.toBeInTheDocument();

    const circuitConfig = {
      ...DEFAULT_CONFIG,
      style: QRStyle.CIRCUIT,
    };
    rerender(<PatternControls config={circuitConfig} onChange={handleChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Scannability Warning: The selected pattern \("Cyber Circuit"\) is complex and may reduce scannability/);
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    rerender(<PatternControls config={DEFAULT_CONFIG} onChange={handleChange} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
