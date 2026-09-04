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
import * as senderModule from '@/hooks/useAnimatedQrSender';

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
    expect(screen.getByText('Send a File by QR Code')).toBeInTheDocument();
    
    // Sliders exist
    expect(screen.getByLabelText('Transfer speed')).toBeInTheDocument();
    expect(screen.getByLabelText('Data per QR')).toBeInTheDocument();

    // Canvas exists
    const canvas = screen.getByRole('img', { name: /transfer qr/i });
    expect(canvas).toBeInTheDocument();
  });

  it('does not expose the high-load simulation control in production', () => {
    vi.stubEnv('DEV', false);
    render(<Page />);

    expect(screen.queryByRole('button', { name: /simulate 50mb/i })).not.toBeInTheDocument();
  });

  it('allows adjusting stream swap rate (FPS) slider controls', async () => {
    render(<Page />);

    const fpsSlider = screen.getByLabelText('Transfer speed') as HTMLInputElement;
    expect(fpsSlider.value).toBe('15');

    await act(async () => {
      fireEvent.change(fpsSlider, { target: { value: '30' } });
    });

    expect(fpsSlider.value).toBe('30');
  });

  it('selects a file dropped onto the file drop zone', () => {
    render(<Page />);

    const file = new File(['payload'], 'dropped.txt', { type: 'text/plain' });
    const fileInput = screen.getByText('Choose file or drag & drop').closest('label');

    expect(fileInput).not.toBeNull();
    fireEvent.drop(fileInput!, { dataTransfer: { files: [file] } });

    expect(screen.getAllByText('dropped.txt')).toHaveLength(2);
  });

  it('simulates the 50MB high-load file and starts/stops transfer', async () => {
    vi.spyOn(senderModule, 'verifyHandshakeFrame').mockResolvedValue(true);
    render(<Page />);

    // Select the simulated file
    const simButton = screen.getByRole('button', { name: /simulate 50mb/i });
    await act(async () => {
      fireEvent.click(simButton);
    });

    // Verify stats exist
    expect(screen.getAllByText('simulated_50mb_file.bin')[0]).toBeInTheDocument();
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
    const startStreamButton = screen.getByRole('button', { name: /start file transfer/i });
    await act(async () => {
      fireEvent.click(startStreamButton);
    });

    expect(startTriggered).toHaveBeenCalled();

    // Check progress is rendered after async handshake check completes
    await waitFor(() => {
      expect(screen.getByText('Memory use')).toBeInTheDocument();
    });

    // Stop streaming
    const stopStreamButton = screen.getByRole('button', { name: /stop file transfer/i });
    await act(async () => {
      fireEvent.click(stopStreamButton);
    });

    expect(screen.queryByText('Memory use')).not.toBeInTheDocument();
  });

  it('unconditionally clears the file input value on change to allow consecutive re-selections of the same file', async () => {
    render(<Page />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['consecutive payload'], 'same_file.txt', { type: 'text/plain' });

    // First selection
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Input value should be cleared synchronously to empty string
    expect(fileInput.value).toBe('');

    // Second consecutive selection of the exact same file
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(fileInput.value).toBe('');
    expect(screen.getAllByText('same_file.txt')[0]).toBeInTheDocument();
  });

  it('clears file input value on drag-and-drop so subsequent manual picker selection works', async () => {
    render(<Page />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const dropZone = screen.getByText('Choose file or drag & drop').closest('label');

    expect(fileInput).not.toBeNull();
    expect(dropZone).not.toBeNull();

    // Manually set input value to simulate lingering input state before drop
    Object.defineProperty(fileInput, 'value', { writable: true, value: 'C:\\fakepath\\old_file.txt' });
    expect(fileInput.value).toBe('C:\\fakepath\\old_file.txt');

    // Drag and drop a new file
    const droppedFile = new File(['dropped payload'], 'dropped_file.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.drop(dropZone!, { dataTransfer: { files: [droppedFile] } });
    });

    // File input value should be cleared synchronously
    expect(fileInput.value).toBe('');
  });
});
