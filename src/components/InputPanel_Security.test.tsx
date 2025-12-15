import { render, screen } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('InputPanel Security (Input Limits)', () => {
  const mockOnChange = vi.fn();

  it('enforces maxLength on URL input', () => {
    render(<InputPanel config={{ ...DEFAULT_CONFIG, type: QRType.URL }} onChange={mockOnChange} />);
    const input = screen.getByLabelText('Website URL');
    expect(input).toHaveAttribute('maxLength', '2048');
  });

  it('enforces maxLength on Text content', () => {
    render(<InputPanel config={{ ...DEFAULT_CONFIG, type: QRType.TEXT }} onChange={mockOnChange} />);
    const input = screen.getByLabelText('Content');
    expect(input).toHaveAttribute('maxLength', '2500');
  });

  it('enforces maxLength on WiFi inputs', () => {
    render(<InputPanel config={{ ...DEFAULT_CONFIG, type: QRType.WIFI }} onChange={mockOnChange} />);

    const ssid = screen.getByLabelText('Network Name (SSID)');
    expect(ssid).toHaveAttribute('maxLength', '32');

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('maxLength', '63');
  });

  it('enforces maxLength on Email inputs', () => {
    render(<InputPanel config={{ ...DEFAULT_CONFIG, type: QRType.EMAIL }} onChange={mockOnChange} />);

    const email = screen.getByLabelText('Email Address');
    expect(email).toHaveAttribute('maxLength', '254'); // RFC 5321

    const subject = screen.getByLabelText('Subject');
    expect(subject).toHaveAttribute('maxLength', '200');

    const body = screen.getByLabelText('Body');
    expect(body).toHaveAttribute('maxLength', '2000');
  });
});
