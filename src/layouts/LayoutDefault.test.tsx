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
import LayoutDefault from './LayoutDefault';

describe('LayoutDefault', () => {
  it('renders children correctly', () => {
    render(
      <LayoutDefault>
        <div data-testid="child-content">Child Content</div>
      </LayoutDefault>,
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('contains a main landmark', () => {
    render(
      <LayoutDefault>
        <div>Content</div>
      </LayoutDefault>,
    );
    // This expects to find an element with role="main"
    // Using queryByRole to avoid throwing immediately if I want to assert it's missing first,
    // but usually we want to test for presence.
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});
