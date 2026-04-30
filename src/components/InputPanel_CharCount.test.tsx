import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WifiInput, EmailInput } from './inputs';
import { WifiEncryption, WifiData, EmailData } from '../types';

describe('Input Character Counts', () => {
  const mockOnChange = vi.fn();

  it('renders character count for Wifi SSID', () => {
    const data: WifiData = {
      ssid: '',
      password: '',
      encryption: WifiEncryption.WPA,
      hidden: false,
    };

    render(<WifiInput data={data} onChange={mockOnChange} />);

    // SSID has maxLength 32
    expect(screen.getByText('0 / 32')).toBeInTheDocument();
  });

  it('renders character count for Wifi Password', () => {
    const data: WifiData = {
      ssid: 'Test Network',
      password: '',
      encryption: WifiEncryption.WPA,
      hidden: false,
    };

    render(<WifiInput data={data} onChange={mockOnChange} />);

    // Password has maxLength 63
    expect(screen.getByText('0 / 63')).toBeInTheDocument();
  });

  it('renders character count for Email Subject', () => {
    const data: EmailData = {
      email: 'test@example.com',
      subject: '',
      body: '',
    };

    render(<EmailInput data={data} onChange={mockOnChange} />);

    // Subject has maxLength 200
    expect(screen.getByText('0 / 200')).toBeInTheDocument();
  });
});
