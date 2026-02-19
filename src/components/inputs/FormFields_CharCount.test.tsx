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
import { TextField } from './FormFields';

describe('TextField CharCount Integration', () => {
  it('renders character count when showCharCount is true and maxLength is provided', () => {
    render(
      <TextField
        id="test-input"
        label="Test Label"
        value="hello"
        maxLength={10}
        showCharCount
        onChange={() => {}}
      />
    );
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('does not render character count when showCharCount is false', () => {
    render(
      <TextField
        id="test-input"
        label="Test Label"
        value="hello"
        maxLength={10}
        onChange={() => {}}
      />
    );
    expect(screen.queryByText('5 / 10')).not.toBeInTheDocument();
  });

  it('does not render character count when maxLength is missing even if showCharCount is true', () => {
    render(
      <TextField
        id="test-input"
        label="Test Label"
        value="hello"
        showCharCount
        onChange={() => {}}
      />
    );
    // The conditional rendering checks for props.maxLength, so CharCount shouldn't render at all
    expect(screen.queryByText(/\/ 10/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 \//)).not.toBeInTheDocument();
  });

  it('updates character count when value changes', () => {
    const { rerender } = render(
      <TextField
        id="test-input"
        label="Test Label"
        value="a"
        maxLength={10}
        showCharCount
        onChange={() => {}}
      />
    );
    expect(screen.getByText('1 / 10')).toBeInTheDocument();

    rerender(
      <TextField
        id="test-input"
        label="Test Label"
        value="abc"
        maxLength={10}
        showCharCount
        onChange={() => {}}
      />
    );
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });
});
