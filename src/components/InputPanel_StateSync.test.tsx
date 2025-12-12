import { render, screen, fireEvent } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType, QRConfig } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('InputPanel State Sync', () => {
  it('syncs QR value when switching back to a populated type', () => {
      // Setup
      let currentConfig: QRConfig = { ...DEFAULT_CONFIG, type: QRType.URL, value: 'http://init.com' };
      const onChange = vi.fn((update) => {
          currentConfig = { ...currentConfig, ...update };
      });

      const { rerender } = render(<InputPanel config={currentConfig} onChange={onChange} />);

      // 1. Switch to WiFi
      const wifiBtn = screen.getByText('WiFi');
      fireEvent.click(wifiBtn);

      // QRTool (parent) would update config.type and reset value
      // We simulate that propagation:
      expect(onChange).toHaveBeenCalledWith({ type: QRType.WIFI, value: '' });
      currentConfig.type = QRType.WIFI;
      currentConfig.value = '';
      rerender(<InputPanel config={currentConfig} onChange={onChange} />);

      // 2. Enter SSID
      const ssidInput = screen.getByLabelText('Network Name (SSID)');
      fireEvent.change(ssidInput, { target: { value: 'MyNet' } });

      // Check update
      // The component calls onChange with the constructed string
      expect(onChange).toHaveBeenLastCalledWith({ value: expect.stringContaining('S:MyNet') });
      // Update our mock state
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      currentConfig.value = lastCall.value;

      // 3. Switch to Text (away)
      const textBtn = screen.getByText('Text');
      fireEvent.click(textBtn);

      expect(onChange).toHaveBeenLastCalledWith({ type: QRType.TEXT, value: '' });
      currentConfig.type = QRType.TEXT;
      currentConfig.value = '';
      rerender(<InputPanel config={currentConfig} onChange={onChange} />);

      // 4. Switch back to WiFi
      const wifiBtn2 = screen.getByText('WiFi');
      fireEvent.click(wifiBtn2);

      expect(onChange).toHaveBeenLastCalledWith({ type: QRType.WIFI, value: '' });
      currentConfig.type = QRType.WIFI;
      currentConfig.value = '';

      rerender(<InputPanel config={currentConfig} onChange={onChange} />);

      // 5. Verify State Sync
      // The input should still show 'MyNet' because InputPanel state wasn't reset
      const ssidInput2 = screen.getByLabelText('Network Name (SSID)');
      expect(ssidInput2).toHaveValue('MyNet');

      // CRITICAL CHECK: The component should have re-emitted the value matching the preserved state
      // If the bug exists, this will fail because onChange was last called with { type: WIFI, value: '' }
      // If fixed, it should be called with { value: ...S:MyNet... }
      expect(onChange).toHaveBeenLastCalledWith({ value: expect.stringContaining('S:MyNet') });
  });
});
