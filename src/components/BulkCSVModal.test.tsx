/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkCSVModal } from './BulkCSVModal';
import { DEFAULT_CONFIG } from '../constants';

vi.mock('@/utils/downloadManager', () => ({
  triggerFileDownload: vi.fn(),
}));

describe('BulkCSVModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BulkCSVModal isOpen={false} onClose={vi.fn()} config={DEFAULT_CONFIG} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <BulkCSVModal isOpen={true} onClose={vi.fn()} config={DEFAULT_CONFIG} />
    );
    expect(screen.getByText('Bulk CSV Batch Generator')).toBeInTheDocument();
    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
  });

  it('handles CSV file upload and shows column options', async () => {
    render(
      <BulkCSVModal isOpen={true} onClose={vi.fn()} config={DEFAULT_CONFIG} />
    );

    const file = new File(['Name,URL\nGoogle,https://google.com'], 'test.csv', {
      type: 'text/csv',
    });

    const input = document.querySelector('#bulk-csv-upload-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    fireEvent.change(input!, { target: { files: [file] } });

    // Wait for FileReader
    await new Promise((r) => setTimeout(r, 100));

    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText('QR Content Payload Column')).toBeInTheDocument();
    expect(screen.getByText('Start Batch Creation')).toBeInTheDocument();
  });
});
