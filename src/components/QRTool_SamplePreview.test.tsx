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

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from './ui/Toast';
import QRTool from './QRTool';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType, QRStyle } from '@/types';
import { getSamplePayload } from '@/packages/qr-payload';

const mockCanvasRender = vi.fn();

vi.mock('./QRCanvas', () => ({
  default: (props: { config: { type: QRType; value: string; fgColor: string; style: QRStyle } }) => {
    mockCanvasRender(props.config);
    return <canvas data-testid="qr-canvas-mock" data-encoded-value={props.config.value} data-style={props.config.style} />;
  },
}));

vi.mock('@/hooks/useScannability', () => ({
  useScannability: () => ({
    status: 'idle',
    health: undefined,
    checkScannability: vi.fn(),
    workerRecoveryActive: false,
  }),
}));

describe('Type-Aware Fallback Sample Payload Engine Integration', () => {
  it('renders type-specific sample payload in QRCanvas when config value is empty', () => {
    mockCanvasRender.mockClear();
    render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: '', type: QRType.WIFI }} /></ToastProvider>);

    expect(screen.getByTestId('sample-preview-badge')).toBeInTheDocument();
    const canvas = screen.getByTestId('qr-canvas-mock');
    expect(canvas).toBeInTheDocument();

    const expectedWifiSample = getSamplePayload(QRType.WIFI);
    expect(canvas.getAttribute('data-encoded-value')).toBe(expectedWifiSample);
  });

  it('updates sample preview value when initial QRType differs', () => {
    mockCanvasRender.mockClear();
    render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: '', type: QRType.VCARD }} /></ToastProvider>);

    const canvas = screen.getByTestId('qr-canvas-mock');
    const expectedVCardSample = getSamplePayload(QRType.VCARD);
    expect(canvas.getAttribute('data-encoded-value')).toBe(expectedVCardSample);
  });

  it('deactivates sample preview mode as soon as non-empty custom value is present', () => {
    mockCanvasRender.mockClear();
    render(<ToastProvider><QRTool initialConfig={{ ...DEFAULT_CONFIG, value: 'https://mycustomsite.com', type: QRType.URL }} /></ToastProvider>);

    expect(screen.queryByTestId('sample-preview-badge')).not.toBeInTheDocument();
    const canvas = screen.getByTestId('qr-canvas-mock');
    expect(canvas.getAttribute('data-encoded-value')).toBe('https://mycustomsite.com');
  });
});
