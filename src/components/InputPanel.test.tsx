import { render, screen, fireEvent } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType, QRConfig } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('InputPanel Component', () => {
  const mockOnChange = vi.fn();

  const renderPanel = (configUpdates: Partial<QRConfig> = {}) => {
    const config = { ...DEFAULT_CONFIG, ...configUpdates };
    render(<InputPanel config={config} onChange={mockOnChange} />);
  };

  it('renders URL input by default', () => {
    renderPanel();

    expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
  });

  it('changes content type', () => {
    renderPanel();
    const wifiButton = screen.getByText('WiFi');
    fireEvent.click(wifiButton);
    expect(mockOnChange).toHaveBeenCalledWith({ type: QRType.WIFI, value: '' });
  });

  it('renders WiFi inputs when WiFi type is selected', () => {
    renderPanel({ type: QRType.WIFI });
    expect(screen.getByLabelText('Network Name (SSID)')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Encryption')).toBeInTheDocument();
    expect(screen.getByLabelText('Hidden Network')).toBeInTheDocument();
  });

  it('updates URL value', () => {
    renderPanel();
    const input = screen.getByLabelText('Website URL');
    fireEvent.change(input, { target: { value: 'https://new-url.com' } });
    expect(mockOnChange).toHaveBeenCalledWith({ value: 'https://new-url.com' });
  });

  it('updates WiFi SSID', () => {
    renderPanel({ type: QRType.WIFI });
    const ssidInput = screen.getByLabelText('Network Name (SSID)');
    fireEvent.change(ssidInput, { target: { value: 'MyWiFi' } });

    // Default encryption is WPA
    const expectedValue = `WIFI:T:WPA;S:MyWiFi;P:;H:false;;`;
    expect(mockOnChange).toHaveBeenCalledWith({ value: expectedValue });
  });

  it('updates WiFi Encryption and formats correctly (WPA2-EAP)', () => {
    renderPanel({ type: QRType.WIFI });

    // Change encryption to WPA2-EAP
    const encryptionSelect = screen.getByLabelText('Encryption');
    fireEvent.change(encryptionSelect, { target: { value: 'WPA2-EAP' } });

    // Should reveal Identity input
    const identityInput = screen.getByLabelText('Identity / Username');
    expect(identityInput).toBeInTheDocument();

    // Fill details
    const ssidInput = screen.getByLabelText('Network Name (SSID)');
    fireEvent.change(ssidInput, { target: { value: 'EnterpriseWiFi' } });

    fireEvent.change(identityInput, { target: { value: 'user123' } });

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'secretPass' } });

    // Check final string construction
    // We need to trigger a change to see the full string construction from the component's state
    // Since state is local to InputPanel, we can only verify the output of onChange for the LAST interaction
    // The previous interactions would have called onChange with partial updates based on the local state at that time.

    // Let's verify the call for the last change (password)
    // At this point: SSID=EnterpriseWiFi, Encryption=WPA2-EAP, Identity=user123, Password=secretPass
    const expectedValue = `WIFI:T:WPA2-EAP;S:EnterpriseWiFi;I:user123;P:secretPass;H:false;;`;
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: expectedValue });
  });

  it('updates WiFi Encryption and formats correctly (nopass)', () => {
    renderPanel({ type: QRType.WIFI });

    const encryptionSelect = screen.getByLabelText('Encryption');
    fireEvent.change(encryptionSelect, { target: { value: 'nopass' } });

    // Password field should disappear
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    const ssidInput = screen.getByLabelText('Network Name (SSID)');
    fireEvent.change(ssidInput, { target: { value: 'OpenWiFi' } });

    const expectedValue = `WIFI:T:nopass;S:OpenWiFi;P:;H:false;;`;
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: expectedValue });
  });

  it('updates WiFi Hidden Network toggle', () => {
      renderPanel({ type: QRType.WIFI });

      const hiddenCheckbox = screen.getByLabelText('Hidden Network');

      // Toggle ON
      fireEvent.click(hiddenCheckbox);

      // We expect the LAST call to have H:true
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.value).toContain('H:true');

      // Toggle OFF
      fireEvent.click(hiddenCheckbox);
      const veryLastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(veryLastCall.value).toContain('H:false');
  });

  it('updates Text content', () => {
      renderPanel({ type: QRType.TEXT });

      const textArea = screen.getByLabelText('Content');
      fireEvent.change(textArea, { target: { value: 'Some text content' } });

      expect(mockOnChange).toHaveBeenCalledWith({ value: 'Some text content' });
  });

  it('clears password in WIFI string when encryption is changed to nopass after setting password', () => {
    renderPanel({ type: QRType.WIFI });

    // 1. Enter a password with WPA (default)
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    // 2. Change encryption to nopass
    const encryptionSelect = screen.getByLabelText('Encryption');
    fireEvent.change(encryptionSelect, { target: { value: 'nopass' } });

    // 3. Verify the output string does NOT contain the password
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall.value).not.toContain('P:secret123');
    // It should have an empty password field
    expect(lastCall.value).toContain('P:;');
  });

  it('formats Email correctly', () => {
      renderPanel({ type: QRType.EMAIL });

      const emailInput = screen.getByLabelText('Email Address');
      const subjectInput = screen.getByLabelText('Subject');
      const bodyInput = screen.getByLabelText('Body');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(subjectInput, { target: { value: 'Hello World' } });
      fireEvent.change(bodyInput, { target: { value: 'This is a test.' } });

      const expectedValue = `mailto:test@example.com?subject=Hello%20World&body=This%20is%20a%20test.`;
      expect(mockOnChange).toHaveBeenLastCalledWith({ value: expectedValue });
  });

  it('formats Phone correctly', () => {
      renderPanel({ type: QRType.PHONE });

      const phoneInput = screen.getByLabelText('Phone Number');
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } });

      expect(mockOnChange).toHaveBeenCalledWith({ value: 'tel:+1234567890' });
  });

  it('formats SMS correctly', () => {
      renderPanel({ type: QRType.SMS });

      const phoneInput = screen.getByLabelText('Phone Number');
      const msgInput = screen.getByLabelText('Pre-filled Message');

      fireEvent.change(phoneInput, { target: { value: '+1234567890' } });
      fireEvent.change(msgInput, { target: { value: 'Hello there' } });

      expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'smsto:+1234567890:Hello there' });
  });

  it('formats vCard correctly', () => {
      renderPanel({ type: QRType.VCARD });

      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText('Company / Organization'), { target: { value: 'Acme Corp' } });
      fireEvent.change(screen.getByLabelText('Job Title'), { target: { value: 'Engineer' } });
      fireEvent.change(screen.getByLabelText('Mobile Phone'), { target: { value: '555-0199' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://example.com' } });

      // Address
      fireEvent.change(screen.getByLabelText('Street'), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Metropolis' } });
      fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'USA' } });

      const expectedVCard = `BEGIN:VCARD\nVERSION:3.0\nN:Doe;John;;;\nFN:John Doe\nORG:Acme Corp\nTITLE:Engineer\nTEL:555-0199\nEMAIL:john@example.com\nURL:https://example.com\nADR:;;123 Main St;Metropolis;;;USA\nEND:VCARD`;

      expect(mockOnChange).toHaveBeenLastCalledWith({ value: expectedVCard });
  });

  it('formats Payment (Crypto) correctly', () => {
    renderPanel({ type: QRType.PAYMENT });

    const addressInput = screen.getByLabelText('Receiver Address');
    fireEvent.change(addressInput, { target: { value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' } });

    // Default is Bitcoin
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' });

    // Add amount
    const amountInput = screen.getByLabelText('Amount (Optional)');
    fireEvent.change(amountInput, { target: { value: '0.005' } });
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.005' });

    // Add label
    const labelInput = screen.getByLabelText('Label / Note (Optional)');
    fireEvent.change(labelInput, { target: { value: 'Donation for Coffee' } });
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.005&label=Donation%20for%20Coffee' });

    // Change Network to Ethereum
    const networkSelect = screen.getByLabelText('Currency / Network');
    fireEvent.change(networkSelect, { target: { value: 'ethereum' } });
    // State persists, so params are re-applied to new network scheme
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'ethereum:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.005&label=Donation%20for%20Coffee' });

    // Change to Custom
    fireEvent.change(networkSelect, { target: { value: 'custom' } });
    // Should output raw address/string
    expect(mockOnChange).toHaveBeenLastCalledWith({ value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' });
  });
});
