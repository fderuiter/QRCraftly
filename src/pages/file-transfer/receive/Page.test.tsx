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
import { ToastProvider } from '@/components/ui/Toast';
import { StreamLookaheadReceiver } from '@/engine/StreamLookahead';

let scanSuccessCallback: ((data: string) => void) | undefined;

vi.mock('@/hooks/useAdaptiveScanner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAdaptiveScanner')>();
  return {
    ...actual,
    useAdaptiveScanner: (options: any) => {
      scanSuccessCallback = options.onScanSuccess;
      return actual.useAdaptiveScanner(options);
    }
  };
});

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
    vi.unstubAllEnvs();
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
    expect(screen.getByText('Receive a File by QR Code')).toBeInTheDocument();
    expect(screen.getByText('Ready to scan. Start an animated QR file transfer from the sender.')).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByRole('button', { name: /activate camera scanner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simulate out-of-order/i })).toBeInTheDocument();
  });

  it('does not expose simulation or security-testing controls in production', () => {
    vi.stubEnv('DEV', false);
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    expect(screen.queryByText('Simulation & Validation Testing')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /simulate out-of-order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /simulate dangerous scheme/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /simulate split threat/i })).not.toBeInTheDocument();
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

    // Verify the inline complete panel replaced the active camera space
    expect(screen.getByTestId('inline-complete-panel')).toBeInTheDocument();
    expect(screen.getByText('Transfer Complete')).toBeInTheDocument();

    // Verify no download is automatically initiated before user confirmation
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();

    // Click the manual Download File button inside the complete panel
    const downloadBtn = screen.getByRole('button', { name: /download file/i });
    expect(downloadBtn).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.click(downloadBtn);
    });

    // Verify that createObjectURL is eventually called for client-side download reconstruction
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
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

  it('allows toggling between text and binary mode and bypasses security alerts in binary mode', async () => {
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>
    );

    expect(screen.getByText('Checks text content for potentially unsafe links and commands.')).toBeInTheDocument();

    const modeSwitch = screen.getByRole('switch', { name: /compatibility mode/i });
    expect(modeSwitch).not.toBeChecked();

    // Toggle to binary mode
    await act(async () => {
      fireEvent.click(modeSwitch);
    });

    expect(modeSwitch).toBeChecked();
    expect(screen.getByText('Accepts all file data, but skips checks that block potentially unsafe text content.')).toBeInTheDocument();

    // Now try simulating a restricted schema - it should not trigger a security warning in binary mode!
    const simDangerousButton = screen.getByRole('button', { name: /simulate dangerous scheme/i });
    await act(async () => {
      fireEvent.click(simDangerousButton);
    });

    // Security alert is NOT rendered
    expect(screen.queryByText(/Security Intercepted/i)).not.toBeInTheDocument();

    // Switch back to text mode
    await act(async () => {
      fireEvent.click(modeSwitch);
    });

    expect(modeSwitch).not.toBeChecked();
    expect(screen.getByText('Checks text content for potentially unsafe links and commands.')).toBeInTheDocument();
  });

  describe('Synchronous Page-Level QR Frame Deduplication', () => {
    it('should track processed frame indices and synchronously discard duplicates before downstream lookahead', async () => {
      const receiveSpy = vi.spyOn(StreamLookaheadReceiver.prototype, 'receive');
      render(
        <ToastProvider>
          <Page />
        </ToastProvider>
      );

      // Verify callback was captured
      expect(scanSuccessCallback).toBeDefined();

      // Scan unique frame index 0
      await act(async () => {
        scanSuccessCallback!("F|0|3|Y2h1bmsw");
      });

      expect(receiveSpy).toHaveBeenCalledTimes(1);
      expect(receiveSpy).toHaveBeenLastCalledWith("F|0|3|Y2h1bmsw");

      // Scan duplicate frame index 0 - should be discarded synchronously
      await act(async () => {
        scanSuccessCallback!("F|0|3|Y2h1bmsw");
      });

      // StreamLookaheadReceiver.receive should NOT be called again
      expect(receiveSpy).toHaveBeenCalledTimes(1);

      // Scan a new unique frame index 1 - should be processed
      await act(async () => {
        scanSuccessCallback!("F|1|3|Y2h1bmsx");
      });

      expect(receiveSpy).toHaveBeenCalledTimes(2);
      expect(receiveSpy).toHaveBeenLastCalledWith("F|1|3|Y2h1bmsx");
    });

    it('should clear the tracking cache when receiver state is reset', async () => {
      const receiveSpy = vi.spyOn(StreamLookaheadReceiver.prototype, 'receive');
      render(
        <ToastProvider>
          <Page />
        </ToastProvider>
      );

      // Scan frame index 0
      await act(async () => {
        scanSuccessCallback!("F|0|3|Y2h1bmsw");
      });
      expect(receiveSpy).toHaveBeenCalledTimes(1);

      // Reset the receiver state
      const clearButton = screen.getByRole('button', { name: /clear transfer progress/i });
      await act(async () => {
        fireEvent.click(clearButton);
      });

      // Scan frame index 0 again - should be processed since cache was cleared
      await act(async () => {
        scanSuccessCallback!("F|0|3|Y2h1bmsw");
      });
      // It will be processed on a new StreamLookaheadReceiver instance
      expect(receiveSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear the tracking cache when a new scanner session starts', async () => {
      const receiveSpy = vi.spyOn(StreamLookaheadReceiver.prototype, 'receive');
      render(
        <ToastProvider>
          <Page />
        </ToastProvider>
      );

      // Scan frame index 0
      await act(async () => {
        scanSuccessCallback!("F|0|3|Y2h1bmsw");
      });
      expect(receiveSpy).toHaveBeenCalledTimes(1);

      // Click Activate to initialize state, then Deactivate
      const activateButton = screen.getByRole('button', { name: /activate camera scanner/i });
      await act(async () => {
        fireEvent.click(activateButton);
      });
      
      const deactivateButton = screen.getByRole('button', { name: /deactivate camera scanner/i });
      await act(async () => {
        fireEvent.click(deactivateButton);
      });

      // Click Activate Camera Scanner again to start a new session
      await act(async () => {
        fireEvent.click(activateButton);
      });

      // Scan frame index 0 again - should be processed because starting a new session resets tracking cache
      await act(async () => {
        scanSuccessCallback!("F|0|3|Y2h1bmsw");
      });
      expect(receiveSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Adaptive Progress Rendering and Validation for File Transfers', () => {
    it('rejects transfers with more than 5000 chunks and displays a user-friendly error message', async () => {
      render(
        <ToastProvider>
          <Page />
        </ToastProvider>
      );

      expect(scanSuccessCallback).toBeDefined();

      await act(async () => {
        scanSuccessCallback!("F|0|5001|Zm9v");
      });

      // Verify error message is rendered
      const errorAlert = screen.getByTestId('receiver-error');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('File transfer rejected: exceeds the maximum limit of 5000 chunks.');

      // Verify grid is not in the document
      expect(screen.queryByTestId('progress-grid')).not.toBeInTheDocument();
    });

    it('renders a fallback high-performance progress bar card and no grid cells when total chunks count is > 200', async () => {
      render(
        <ToastProvider>
          <Page />
        </ToastProvider>
      );

      expect(scanSuccessCallback).toBeDefined();

      await act(async () => {
        scanSuccessCallback!("F|0|250|Zm9v");
      });

      // Check progress percentage text
      expect(screen.getByText('0%')).toBeInTheDocument();
      // Received parts text: receivedCount / totalChunks parts
      expect(screen.getByText('1 / 250 parts')).toBeInTheDocument();

      // Verify fallback-progress-card is in the document
      expect(screen.getByTestId('fallback-progress-card')).toBeInTheDocument();
      expect(screen.getByText('High-Performance Progress Bar Active')).toBeInTheDocument();

      // Verify detailed block grid is NOT in the document
      expect(screen.queryByTestId('progress-grid')).not.toBeInTheDocument();
    });

    it('renders a detailed block grid and no fallback card when total chunks count is 200 or fewer', async () => {
      render(
        <ToastProvider>
          <Page />
        </ToastProvider>
      );

      expect(scanSuccessCallback).toBeDefined();

      await act(async () => {
        scanSuccessCallback!("F|0|150|Zm9v");
      });

      // Verify detailed block grid is in the document
      expect(screen.getByTestId('progress-grid')).toBeInTheDocument();

      // Verify fallback progress card is NOT in the document
      expect(screen.queryByTestId('fallback-progress-card')).not.toBeInTheDocument();
    });
  });
});
