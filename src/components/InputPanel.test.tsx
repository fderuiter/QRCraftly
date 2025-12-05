import { render, screen, fireEvent } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType, QRConfig } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('InputPanel Component', () => {
  const mockOnChange = vi.fn();

  it('renders URL input by default', () => {
    render(<InputPanel config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
  });

  it('changes content type', () => {
    render(<InputPanel config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Find one of the type buttons (e.g., WiFi)
    // The buttons have text inside span or just text.
    // Let's find by text.
    const wifiButton = screen.getByText('WiFi');
    fireEvent.click(wifiButton);

    expect(mockOnChange).toHaveBeenCalledWith({ type: QRType.WIFI, value: '' });
  });

  it('renders WiFi inputs when WiFi type is selected', () => {
    const wifiConfig: QRConfig = { ...DEFAULT_CONFIG, type: QRType.WIFI };
    render(<InputPanel config={wifiConfig} onChange={mockOnChange} />);

    expect(screen.getByLabelText('Network Name (SSID)')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Encryption')).toBeInTheDocument();
    expect(screen.getByLabelText('Hidden Network')).toBeInTheDocument();
  });

  it('updates URL value', () => {
    render(<InputPanel config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    const input = screen.getByLabelText('Website URL');
    fireEvent.change(input, { target: { value: 'https://new-url.com' } });

    expect(mockOnChange).toHaveBeenCalledWith({ value: 'https://new-url.com' });
  });

  it('updates WiFi SSID', () => {
    const wifiConfig: QRConfig = { ...DEFAULT_CONFIG, type: QRType.WIFI };
    render(<InputPanel config={wifiConfig} onChange={mockOnChange} />);

    const ssidInput = screen.getByLabelText('Network Name (SSID)');
    fireEvent.change(ssidInput, { target: { value: 'MyWiFi' } });

    // Based on InputPanel implementation:
    // wifiString = `WIFI:T:${newData.encryption};S:${newData.ssid};P:${newData.password};H:${newData.hidden};;`;
    // Default encryption is WPA, password empty, hidden false
    const expectedValue = `WIFI:T:WPA;S:MyWiFi;P:;H:false;;`;
    expect(mockOnChange).toHaveBeenCalledWith({ value: expectedValue });
  });
});
