
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Page from './+Page';
import { DEFAULT_CONFIG } from '../../constants';

// Mock QRTool component since we only want to test if it's passed correct props
vi.mock('../../components/QRTool', () => ({
  default: ({ initialConfig }: any) => (
    <div data-testid="qr-tool-mock">
      QRTool with type: {initialConfig?.type}
    </div>
  ),
}));

describe('WiFi QR Code Page', () => {
  it('renders QRTool with WiFi configuration', () => {
    render(<Page />);
    
    const qrTool = screen.getByTestId('qr-tool-mock');
    expect(qrTool).toBeInTheDocument();
    expect(qrTool).toHaveTextContent('QRTool with type: wifi');
  });
});
