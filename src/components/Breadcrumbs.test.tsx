import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders nothing on the home page', () => {
    const { container } = render(<Breadcrumbs pageId="index" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links Home and marks the current page', () => {
    render(<Breadcrumbs pageId="wifi-qr-code" />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('WiFi QR Code')).toHaveAttribute('aria-current', 'page');
  });

  it('links each parent of a nested route', () => {
    render(<Breadcrumbs pageId="file-transfer/receive" />);
    expect(screen.getByRole('link', { name: 'File Transfer' })).toHaveAttribute('href', '/file-transfer');
    expect(screen.getByText('Receive')).toHaveAttribute('aria-current', 'page');
  });
});
