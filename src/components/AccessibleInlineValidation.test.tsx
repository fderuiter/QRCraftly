import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TextField } from './ui/TextField';
import { WifiInput } from './inputs/WifiInput';
import { VCardInput } from './inputs/VCardInput';
import { PaymentInput } from './inputs/PaymentInput';
import { WifiEncryption, CryptoNetwork } from '../types';

describe('Accessible Inline Validation and Accessible Fields', () => {
  it('displays exactly 1 character used when numeric zero (0) is input', () => {
    render(
      <TextField
        id="zero-field"
        label="Zero Field"
        value={0}
        maxLength={10}
        showCharCount={true}
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText('1 of 10 characters used')).toBeInTheDocument();
  });

  it('preserves existing aria-describedby when custom parameters are passed', () => {
    render(
      <TextField
        id="custom-described-field"
        label="Custom Field"
        value="test"
        maxLength={10}
        showCharCount={true}
        error="Field error"
        aria-describedby="external-helper-id"
        onChange={() => {}}
      />
    );

    const input = screen.getByLabelText('Custom Field');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toContain('custom-described-field-error');
    expect(describedBy).toContain('custom-described-field-char-count');
    expect(describedBy).toContain('external-helper-id');
  });

  it('WiFi input displays local inline error when control characters are input', () => {
    const mockData = {
      ssid: 'MyWiFi\u0001Network',
      password: '',
      encryption: WifiEncryption.WPA,
      hidden: false,
      eapIdentity: '',
    };

    render(<WifiInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Network Name cannot contain control or zero-width characters.');
  });

  it('vCard website input displays local inline error when an insecure website URL is input', () => {
    const mockData = {
      firstName: '',
      lastName: '',
      organization: '',
      title: '',
      phone: '',
      email: '',
      website: 'javascript:alert(1)',
      street: '',
      city: '',
      zip: '',
      country: '',
    };

    render(<VCardInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Unsafe URL scheme or malicious protocol detected.');
  });

  it('Payment input displays local inline error when a dangerous address URL is input', () => {
    const mockData = {
      network: CryptoNetwork.CUSTOM,
      address: 'javascript:alert(1)',
      amount: '',
      label: '',
    };

    render(<PaymentInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Unsafe URL scheme or malicious protocol detected.');
  });

  it('Payment input displays invalid Base58 character error for invalid Solana address', () => {
    const mockData = {
      network: CryptoNetwork.SOLANA,
      address: '0uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lya',
      amount: '',
      label: '',
    };

    render(<PaymentInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Base58');
  });

  it('Payment input displays length validation error for non-32-byte Solana address', () => {
    const mockData = {
      network: CryptoNetwork.SOLANA,
      address: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Ly', // 31 bytes
      amount: '',
      label: '',
    };

    render(<PaymentInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('32 bytes');
  });

  it('Payment input clears error when a valid 32-byte Base58 Solana address is input', () => {
    const mockData = {
      network: CryptoNetwork.SOLANA,
      address: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lya', // valid 32 bytes
      amount: '',
      label: '',
    };

    render(<PaymentInput data={mockData} onChange={() => {}} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
