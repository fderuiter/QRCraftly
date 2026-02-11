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
import { describe, it, expect } from 'vitest';
import { CharCount } from './CharCount';

describe('CharCount Component', () => {
  it('renders correct count', () => {
    render(<CharCount current={50} max={100} />);
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
  });

  it('renders default color for low usage', () => {
    render(<CharCount current={10} max={100} />);
    const counter = screen.getByText('10 / 100');
    expect(counter).toHaveClass('text-slate-500');
  });

  it('renders warning color for >= 90% usage', () => {
    render(<CharCount current={90} max={100} />);
    const counter = screen.getByText('90 / 100');
    expect(counter).toHaveClass('text-amber-600');
  });

  it('renders error color for 100% usage', () => {
    render(<CharCount current={100} max={100} />);
    const counter = screen.getByText('100 / 100');
    expect(counter).toHaveClass('text-rose-600');
  });

  it('has accessibility attributes', () => {
    render(<CharCount current={50} max={100} />);
    const counter = screen.getByText('50 / 100');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveAttribute('aria-atomic', 'true');
  });
});
