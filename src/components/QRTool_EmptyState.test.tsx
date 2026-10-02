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

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { ToastProvider } from './ui/Toast';
import QRTool from './QRTool';
import { DEFAULT_CONFIG } from '@/constants';

// A scannability result left over from the last non-empty value.
vi.mock('@/hooks/useScannability', () => ({
  useScannability: () => ({
    status: 'physical-pass',
    health: { score: 100, warnings: [] },
    checkScannability: vi.fn(),
    workerRecoveryActive: false,
  }),
}));

vi.mock('./QRCanvas', () => ({
  default: () => <canvas data-testid="qr-canvas-mock" />,
}));

const exportAsset = vi.fn();
vi.mock('@/hooks/useQRDownload', () => ({
  useQRDownload: () => ({ exportAsset }),
}));

describe('QRTool with sample fallback empty state', () => {
  beforeEach(() => {
    exportAsset.mockReset();
    window.localStorage.clear();
  });

  it('shows Sample Preview badge and active canvas instead of verified badge when content is empty', () => {
    render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: '' }} /></ToastProvider>);

    const preview = screen.getByRole('region', { name: 'QR Code Preview' });
    expect(within(preview).getByTestId('sample-preview-badge')).toHaveTextContent('Sample Preview');
    expect(within(preview).getByTestId('qr-canvas-mock')).toBeInTheDocument();
    expect(within(preview).queryByText(/verified/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/Health:/i)).not.toBeInTheDocument();
    expect(within(preview).getByTestId('scannability-indicator-placeholder')).toBeInTheDocument();
  });

  it('marks export actions protected and displays alert toast instead of exporting', () => {
    render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: '' }} /></ToastProvider>);

    const download = screen.getByRole('button', { name: /^Download$/ });
    const copy = screen.getByRole('button', { name: /Copy QR code/ });

    for (const button of [download, copy]) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
    }
    // The Download control is not a menu while in sample mode.
    expect(download).not.toHaveAttribute('aria-haspopup');

    fireEvent.click(download);
    expect(exportAsset).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter content to generate a QR code\. Exports are available/)).toBeInTheDocument();
  });

  it('hides sample preview badge and restores verified status when user provides content', () => {
    render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: 'https://example.com' }} /></ToastProvider>);

    expect(screen.queryByTestId('sample-preview-badge')).not.toBeInTheDocument();
    expect(screen.getByText('Print simulation verified')).toBeInTheDocument();
    const download = screen.getByRole('button', { name: /^Download$/ });
    expect(download).not.toHaveAttribute('aria-disabled');
    expect(download).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('has no axe violations in sample preview state', async () => {
    const { container } = render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: '' }} /></ToastProvider>);
    const preview = screen.getByRole('region', { name: 'QR Code Preview' });
    expect(await axe(preview)).toHaveNoViolations();
    expect(container).toBeTruthy();
  });
});
