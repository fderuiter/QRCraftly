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

// @vitest-environment jsdom
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import Page from './+Page';

// Mock the crypto APIs if missing in test environment
const mockSubtle = {
  digest: async (algorithm: string, data: ArrayBuffer) => {
    // Return a mock SHA-256 hash value that is verified in tests
    return new Uint8Array([
      0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14,
      0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24,
      0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c,
      0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55
    ]).buffer;
  }
};

Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: mockSubtle,
    getRandomValues: (arr: any) => arr,
  },
  configurable: true,
  writable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: {
      subtle: mockSubtle,
      getRandomValues: (arr: any) => arr,
    },
    configurable: true,
    writable: true,
  });
}

// Mock the continuous QR scanner component for easy integration testing
vi.mock('@/components/QRScanner', () => {
  return {
    QRScanner: ({ onScanSuccess }: any) => {
      return (
        <div data-testid="mock-qr-scanner">
          <span>Mock Camera Stream</span>
          <button
            data-testid="trigger-scan-handshake"
            onClick={() => onScanSuccess('H|test.txt|8|text/plain|e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')}
          >
            Scan Handshake
          </button>
          <button
            data-testid="trigger-scan-data-0"
            onClick={() => onScanSuccess('F|0|2|Zm9v')}
          >
            Scan Data 0
          </button>
          <button
            data-testid="trigger-scan-data-1"
            onClick={() => onScanSuccess('F|1|2|YmFy')}
          >
            Scan Data 1
          </button>
          <button
            data-testid="trigger-scan-corrupt-handshake"
            onClick={() => onScanSuccess('H|test.txt|8|text/plain|corruptedhash')}
          >
            Scan Corrupt Handshake
          </button>
        </div>
      );
    }
  };
});

describe('File Transfer Page & Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  it('renders the file-transfer page with options, headers and single canvas', () => {
    render(<Page />);

    expect(screen.getByText('QRCraftly')).toBeInTheDocument();
    expect(screen.getByText('High-Performance File Streaming')).toBeInTheDocument();
    
    // Sliders exist
    expect(screen.getByLabelText('Stream Swap Rate (FPS)')).toBeInTheDocument();
    expect(screen.getByLabelText('Slice Block Size')).toBeInTheDocument();

    // Canvas exists
    const canvas = screen.getByRole('img', { name: /stream/i });
    expect(canvas).toBeInTheDocument();
  });

  it('does not expose the high-load simulation control in production', () => {
    vi.stubEnv('PROD', true);
    render(<Page />);

    expect(screen.queryByRole('button', { name: /simulate 50mb/i })).not.toBeInTheDocument();
  });

  it('allows adjusting stream swap rate (FPS) slider controls', async () => {
    render(<Page />);

    const fpsSlider = screen.getByLabelText('Stream Swap Rate (FPS)') as HTMLInputElement;
    expect(fpsSlider.value).toBe('15');

    await act(async () => {
      fireEvent.change(fpsSlider, { target: { value: '30' } });
    });

    expect(fpsSlider.value).toBe('30');
  });

  it('simulates the 50MB high-load file and starts/stops transfer', async () => {
    render(<Page />);

    // Select the simulated file
    const simButton = screen.getByRole('button', { name: /simulate 50mb/i });
    await act(async () => {
      fireEvent.click(simButton);
    });

    // Verify stats exist
    expect(screen.getAllByText('simulation_50mb_payload.bin')[0]).toBeInTheDocument();
    expect(screen.getByText('50.00 MB')).toBeInTheDocument();

    // Set up worker interceptor to mock file transfer events
    const startTriggered = vi.fn();
    let interceptedWorker: any = null;

    globalThis.mockWorkerControl.setInterceptor((message: any, worker: any) => {
      interceptedWorker = worker;
      if (message.type === 'START') {
        startTriggered();
        
        // Mock worker sending first progress update
        worker.dispatchMessage({
          type: 'PROGRESS',
          index: 0,
          total: 1000
        });

        // Mock worker generating first frame matrix
        worker.dispatchMessage({
          type: 'FRAME',
          index: 0,
          total: 1000,
          size: 21,
          data: new Uint8Array(21 * 21) // 21x21 empty grid
        });
      }
    });

    // Start streaming
    const startStreamButton = screen.getByRole('button', { name: /start streaming file/i });
    await act(async () => {
      fireEvent.click(startStreamButton);
    });

    expect(startTriggered).toHaveBeenCalled();

    // Check progress is rendered
    expect(screen.getByText('Active Heap')).toBeInTheDocument();

    // Stop streaming
    const stopStreamButton = screen.getByRole('button', { name: /stop streaming file/i });
    await act(async () => {
      fireEvent.click(stopStreamButton);
    });

    expect(screen.queryByText('Active Heap')).not.toBeInTheDocument();
  });
});
