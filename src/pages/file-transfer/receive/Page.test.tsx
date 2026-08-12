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
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import Page from './+Page';
import { ToastProvider } from '@/components/ui/Toast';

describe('File Transfer Receive Page & Pipeline', () => {
  let originalMediaDevices: any;

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'mock-download-url');
    global.URL.revokeObjectURL = vi.fn();
    // Mock HTMLMediaElement.prototype.play
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());

    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: originalMediaDevices,
    });
    vi.restoreAllMocks();
  });

  it('renders the file-transfer receive page with initial elements', () => {
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    expect(screen.getByText('QRCraftly')).toBeInTheDocument();
    expect(screen.getByText('High-Performance File Receiver')).toBeInTheDocument();
    expect(screen.getByText('Ready to scan. Please stream or simulate an animated QR file transfer.')).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByRole('button', { name: /activate camera scanner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simulate out-of-order/i })).toBeInTheDocument();
  });

  it('can activate and deactivate the camera scanner', async () => {
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    const activateButton = screen.getByRole('button', { name: /activate camera scanner/i });
    
    await act(async () => {
      fireEvent.click(activateButton);
    });

    // Scanner is active
    expect(screen.getByText('Active Scanning')).toBeInTheDocument();
    
    const deactivateButton = screen.getByRole('button', { name: /deactivate camera scanner/i });
    expect(deactivateButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deactivateButton);
    });

    expect(screen.getByText('Camera inactive')).toBeInTheDocument();
  });

  it('simulates out-of-order packet reassembly and triggers offline download on complete', async () => {
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    const simButton = screen.getByRole('button', { name: /simulate out-of-order/i });
    
    await act(async () => {
      fireEvent.click(simButton);
    });

    // Wait for setTimeouts inside simulation to execute
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    });

    // Verify all 10 chunks were eventually received
    const grid = screen.getByTestId('progress-grid');
    expect(grid).toBeInTheDocument();

    for (let i = 0; i < 10; i++) {
      const block = screen.getByTestId(`chunk-block-${i}`);
      expect(block).toBeInTheDocument();
      expect(block).toHaveAttribute('data-received', 'true');
    }

    // Verify that createObjectURL was called for client-side download reconstruction
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('terminates session and triggers a security alert when restricted scheme (javascript:) is scanned', async () => {
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    const simButton = screen.getByRole('button', { name: /simulate dangerous scheme/i });
    
    await act(async () => {
      fireEvent.click(simButton);
    });

    // Security alert is rendered
    expect(screen.getByText(/Security Intercepted/i)).toBeInTheDocument();
    expect(screen.getByText(/Dangerous protocol detected and blocked: javascript:/i)).toBeInTheDocument();
    
    // Scanner is inactive
    expect(screen.getByText('Camera inactive')).toBeInTheDocument();
  });

  it('lookahead receiver intercepts and terminates a split protocol threat across frames', async () => {
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    const simButton = screen.getByRole('button', { name: /simulate split threat/i });
    
    await act(async () => {
      fireEvent.click(simButton);
    });

    // Wait for the 100ms deferred frame
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(screen.getByText(/Security Intercepted/i)).toBeInTheDocument();
    expect(screen.getByText(/MaliciousStreamError: Detected dangerous protocol prefix "javascript:" split across frames./i)).toBeInTheDocument();
    expect(screen.getByText('Camera inactive')).toBeInTheDocument();
  });
});
