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
import StyleControls from './StyleControls';
import { DEFAULT_CONFIG } from '../constants';
import userEvent from '@testing-library/user-event';

describe('StyleControls Accessibility', () => {
  const mockOnChange = vi.fn();

  it('Advanced Mode toggle should have correct aria attributes', () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Find the Advanced Mode toggle button
    const advancedToggle = screen.getByRole('button', { name: /Advanced Mode/i });

    // Initial state: not expanded
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
    expect(advancedToggle).toHaveAttribute('aria-controls', 'advanced-settings-panel');

    // Click to expand
    fireEvent.click(advancedToggle);

    // Expect aria-expanded to be true
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');

    // Verify the panel exists and has the correct ID
    const panel = document.getElementById('advanced-settings-panel');
    expect(panel).toBeInTheDocument();

    // Verify content is inside the panel (e.g. Error Correction Level)
    expect(screen.getByText('Error Correction Level')).toBeInTheDocument();
    expect(panel).toContainElement(screen.getByText('Error Correction Level').closest('div')?.parentElement || null);
  });

  it('logo upload trigger has focus ring classes, aria-describedby, and handles accessibility correctly', async () => {
    const user = userEvent.setup();
    const { container } = render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Check if the upload logo button exists and has the correct classes and attributes
    const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
    expect(uploadButton).toBeInTheDocument();

    // Check focus-visible ring style classes
    expect(uploadButton).toHaveClass('focus-visible:ring-2');
    expect(uploadButton).toHaveClass('focus-visible:ring-teal-500');
    expect(uploadButton).toHaveClass('focus-visible:outline-none');

    // Initially aria-describedby points to the helper text ID
    expect(uploadButton).toHaveAttribute('aria-describedby', 'logo-upload-help');

    // Try to upload an invalid file type (e.g. .txt)
    const file = new File(['hello world'], 'hello.txt', { type: 'text/plain' });
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput as HTMLElement, { target: { files: [file] } });

    // Verify error is shown with correct ID and aria role="alert"
    const errorMsg = await screen.findByText(/Only JPEG, PNG, WebP, and SVG are allowed/i);
    expect(errorMsg).toBeInTheDocument();
    expect(errorMsg).toHaveAttribute('id', 'logo-upload-error');
    expect(errorMsg).toHaveAttribute('role', 'alert');

    // aria-describedby should now link both help and error IDs
    expect(uploadButton).toHaveAttribute('aria-describedby', 'logo-upload-help logo-upload-error');

    // Ensure the upload button trigger does NOT register HTML5 drag/drop event handlers
    expect(uploadButton.ondragover).toBeNull();
    expect(uploadButton.ondrop).toBeNull();
  });
});
