import { render, screen, fireEvent, act } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType, QRConfig } from '../types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('InputPanel Edge Cases', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    act(() => { vi.advanceTimersByTime(100); });

    fireEvent.change(passwordInput, { target: { value: trickyPass } });
    act(() => { vi.advanceTimersByTime(100); });

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
    act(() => { vi.advanceTimersByTime(100); });

    // Should result in clean number
    expect(mockOnChange).toHaveBeenCalledWith({ value: 'tel:+1555123456' });
  });

  it('handles empty cleaned phone number gracefully', () => {
    renderPanel({ type: QRType.PHONE });

    const phoneInput = screen.getByLabelText('Phone Number');

    // Input with only stripped characters
    fireEvent.change(phoneInput, { target: { value: ' : ' } });
    act(() => { vi.advanceTimersByTime(100); });

    // Should result in empty tel: prefix
    expect(mockOnChange).toHaveBeenCalledWith({ value: 'tel:' });
  });

  it('handles colons in SMS message correctly', () => {
    renderPanel({ type: QRType.SMS });

    const phoneInput = screen.getByLabelText('Phone Number');
    const msgInput = screen.getByLabelText('Pre-filled Message');

    fireEvent.change(phoneInput, { target: { value: '123' } });
    act(() => { vi.advanceTimersByTime(100); });

    fireEvent.change(msgInput, { target: { value: 'Time: 12:30 PM' } });
    act(() => { vi.advanceTimersByTime(100); });

    // Format: sms:number?body=encoded_message
    // Colons in message should be URL encoded
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'sms:123?body=Time%3A%2012%3A30%20PM' });
  });

  it('escapes special characters in WPA2-EAP Identity', () => {
    renderPanel({ type: QRType.WIFI });

    // Switch to WPA2-EAP
    const encryptionSelect = screen.getByLabelText('Encryption');
    fireEvent.change(encryptionSelect, { target: { value: 'WPA2-EAP' } });
    act(() => { vi.advanceTimersByTime(100); });

    const identityInput = screen.getByLabelText('Identity / Username');

    const trickyIdentity = 'domain\\user;name';
    fireEvent.change(identityInput, { target: { value: trickyIdentity } });
    act(() => { vi.advanceTimersByTime(100); });

    const expectedIdentity = 'domain\\\\user\\;name';

    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall.value).toContain(`I:${expectedIdentity}`);
  });
});
