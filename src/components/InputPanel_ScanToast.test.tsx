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

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InputPanel, { getQRTypeLabel } from './InputPanel';
import { ToastProvider } from './ui/Toast';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType } from '@/types';

vi.mock('./QRScanner', () => {
  const MockScanner = ({ onScanSuccess }: { onScanSuccess: (data: string) => void }) => (
    <button type="button" onClick={() => onScanSuccess('BEGIN:VCARD\nVERSION:3.0\nFN:Ada Lovelace\nEND:VCARD')}>
      Simulate scan
    </button>
  );
  return { default: MockScanner, QRScanner: MockScanner };
});

describe('InputPanel scan toast (#978)', () => {
  it('names every QR type in human-readable form', () => {
    for (const type of Object.values(QRType)) {
      expect(getQRTypeLabel(type)).toBeTruthy();
      expect(getQRTypeLabel(type)).not.toMatch(/^[A-Z]{4,}$/);
    }
    expect(getQRTypeLabel(QRType.VCARD)).toBe('vCard contact');
  });

  it('shows the detected type with its display name, not the raw enum value', () => {
    render(
      <ToastProvider>
        <InputPanel config={{ ...DEFAULT_CONFIG }} onChange={vi.fn()} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /scan qr code/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate scan' }));
    expect(screen.getByText(/Type detected: vCard contact/)).toBeInTheDocument();
    expect(screen.queryByText(/Type detected: VCARD/)).not.toBeInTheDocument();
  });
});
