/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BulkCsvInput } from './BulkCsvInput';
import { BulkCsvData } from '@/types';
import { QRProvider } from '@/context/QRContext';
import * as downloadManager from '@/utils/downloadManager';

// Spy on file download trigger
vi.spyOn(downloadManager, 'triggerFileDownload').mockImplementation(() => {});

// Mock HTMLCanvasElement methods for jsdom
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock-png-data'], { type: 'image/png' }));
});
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

function renderWithProvider(ui: React.ReactElement) {
  return render(<QRProvider>{ui}</QRProvider>);
}

describe('BulkCsvInput Component', () => {
  const initialData: BulkCsvData = {
    csvContent: '',
    payloadColumn: '',
    filenameColumn: '',
    exportFormat: 'png',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload prompt when no CSV content is loaded', () => {
    renderWithProvider(<BulkCsvInput data={initialData} onChange={vi.fn()} />);

    expect(screen.getByText('Upload CSV or TXT File')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('parses uploaded CSV file, detects columns, and displays controls', async () => {
    const csvContent = 'URL,Name\nhttps://example.com/1,Code1\nhttps://example.com/2,Code2';
    const onChange = vi.fn();

    const data: BulkCsvData = {
      ...initialData,
      csvContent,
      fileName: 'test-batch.csv',
    };

    renderWithProvider(<BulkCsvInput data={data} onChange={onChange} />);

    expect(screen.getByText('test-batch.csv')).toBeInTheDocument();
    expect(screen.getByText('2 rows found • 2 columns detected')).toBeInTheDocument();

    const payloadSelect = screen.getByLabelText('Payload Column (QR Content)') as HTMLSelectElement;
    expect(payloadSelect.value).toBe('URL');

    const filenameSelect = screen.getByLabelText('Filename Column') as HTMLSelectElement;
    expect(filenameSelect.value).toBe('Name');

    const formatSelect = screen.getByLabelText('Image Format') as HTMLSelectElement;
    expect(formatSelect.value).toBe('png');
  });

  it('displays warning when CSV contains over 100 rows', () => {
    // Generate CSV with 105 rows
    const header = 'URL,Name\n';
    const rows = Array.from({ length: 105 }, (_, i) => `https://example.com/${i + 1},Name_${i + 1}`).join('\n');
    const csvContent = header + rows;

    const data: BulkCsvData = {
      ...initialData,
      csvContent,
      fileName: 'large-batch.csv',
    };

    renderWithProvider(<BulkCsvInput data={data} onChange={vi.fn()} />);

    expect(screen.getByText('Main Thread Processing Warning')).toBeInTheDocument();
    expect(screen.getByText(/exceeding 100 rows/)).toBeInTheDocument();
  });

  it('shows error modal when CSV contains rows with empty payload values', async () => {
    const csvContent = 'URL,Name\nhttps://example.com/1,Code1\n,Code2\nhttps://example.com/3,Code3';

    const data: BulkCsvData = {
      ...initialData,
      csvContent,
      payloadColumn: 'URL',
      filenameColumn: 'Name',
      exportFormat: 'png',
    };

    renderWithProvider(<BulkCsvInput data={data} onChange={vi.fn()} />);

    const generateBtn = screen.getByRole('button', { name: 'Generate Batch' });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('CSV Row Validation Errors')).toBeInTheDocument();
      expect(screen.getByText("Row 2: Empty value in payload column 'URL'")).toBeInTheDocument();
    });
  });

  it('generates ZIP batch and triggers file download for valid CSV rows in SVG format', async () => {
    const csvContent = 'URL,Name\nhttps://example.com/1,Code1\nhttps://example.com/2,Code2';

    const data: BulkCsvData = {
      ...initialData,
      csvContent,
      payloadColumn: 'URL',
      filenameColumn: 'Name',
      exportFormat: 'svg',
      fileName: 'urls.csv',
    };

    renderWithProvider(<BulkCsvInput data={data} onChange={vi.fn()} />);

    const generateBtn = screen.getByRole('button', { name: 'Generate Batch' });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(downloadManager.triggerFileDownload).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        'urls-qrcodes.zip',
        'application/zip'
      );
    });
  });

  it('generates ZIP batch and triggers file download for valid CSV rows in PNG format', async () => {
    const csvContent = 'URL,Name\nhttps://example.com/1,Code1\nhttps://example.com/2,Code2';

    const data: BulkCsvData = {
      ...initialData,
      csvContent,
      payloadColumn: 'URL',
      filenameColumn: 'Name',
      exportFormat: 'png',
      fileName: 'urls.csv',
    };

    renderWithProvider(<BulkCsvInput data={data} onChange={vi.fn()} />);

    const generateBtn = screen.getByRole('button', { name: 'Generate Batch' });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(downloadManager.triggerFileDownload).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        'urls-qrcodes.zip',
        'application/zip'
      );
    });
  });
});
