import { render, screen, fireEvent } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType, QRConfig } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('InputPanel Edge Cases', () => {
  const mockOnChange = vi.fn();

  const renderPanel = (configUpdates: Partial<QRConfig> = {}) => {
    const config = { ...DEFAULT_CONFIG, ...configUpdates };
    render(<InputPanel config={config} onChange={mockOnChange} />);
  };

  it('escapes special characters in WiFi SSID and Password', () => {
    renderPanel({ type: QRType.WIFI });

    const ssidInput = screen.getByLabelText('Network Name (SSID)');
    const passwordInput = screen.getByLabelText('Password');

    // Characters that need escaping: \ ; , " :
    const trickySSID = 'My "Special" WiFi;\\:';
    const trickyPass = 'P@ssw,or;d\\';

    fireEvent.change(ssidInput, { target: { value: trickySSID } });
    fireEvent.change(passwordInput, { target: { value: trickyPass } });

    // Expect backslashes before special chars
    // SSID: My "Special" WiFi;\: -> My \"Special\" WiFi\;\\\:
    // Pass: P@ssw,or;d\ -> P@ssw\,or\;d\\

    // Construct the expected WiFi string
    // Format: WIFI:T:WPA;S:<ssid>;P:<pass>;H:false;;
    const expectedSSID = 'My \\"Special\\" WiFi\\;\\\\\\:';
    const expectedPass = 'P@ssw\\,or\\;d\\\\';

    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall.value).toContain(`S:${expectedSSID}`);
    expect(lastCall.value).toContain(`P:${expectedPass}`);
  });

  it('cleans formatting characters from Phone number', () => {
    renderPanel({ type: QRType.PHONE });

    const phoneInput = screen.getByLabelText('Phone Number');

    // Input with spaces, colons (which should be stripped)
    fireEvent.change(phoneInput, { target: { value: '+1 555 : 123 456' } });

    // Should result in clean number
    expect(mockOnChange).toHaveBeenCalledWith({ value: 'tel:+1555123456' });
  });

  it('handles empty cleaned phone number gracefully', () => {
    renderPanel({ type: QRType.PHONE });

    const phoneInput = screen.getByLabelText('Phone Number');

    // Input with only stripped characters
    fireEvent.change(phoneInput, { target: { value: ' : ' } });

    // Should result in empty tel: prefix
    expect(mockOnChange).toHaveBeenCalledWith({ value: 'tel:' });
  });

  it('handles colons in SMS message correctly', () => {
    renderPanel({ type: QRType.SMS });

    const phoneInput = screen.getByLabelText('Phone Number');
    const msgInput = screen.getByLabelText('Pre-filled Message');

    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.change(msgInput, { target: { value: 'Time: 12:30 PM' } });

    // Format: smsto:number:message
    // Colons in message should be preserved as-is
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'smsto:123:Time: 12:30 PM' });
  });

  it('escapes special characters in WPA2-EAP Identity', () => {
    renderPanel({ type: QRType.WIFI });

    // Switch to WPA2-EAP
    const encryptionSelect = screen.getByLabelText('Encryption');
    fireEvent.change(encryptionSelect, { target: { value: 'WPA2-EAP' } });

    const identityInput = screen.getByLabelText('Identity / Username');

    const trickyIdentity = 'domain\\user;name';
    fireEvent.change(identityInput, { target: { value: trickyIdentity } });

    const expectedIdentity = 'domain\\\\user\\;name';

    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall.value).toContain(`I:${expectedIdentity}`);
  });
});
