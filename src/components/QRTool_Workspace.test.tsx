/*
    QRCraftly
    Copyright (C) 2026 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { act, render, screen, within, fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider } from './ui/Toast';
import QRTool from './QRTool';
import { contentRegistry } from '@/data/contentRegistry';

vi.mock('./QRCanvas', () => ({
  default: () => <canvas data-testid="qr-canvas-mock" />,
}));

function headingLevels(root: ParentNode): number[] {
  return Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]));
}

describe('Generator workspace structure (#795, #802)', { timeout: 20000 }, () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('puts content entry first, then the preview, then appearance (mobile order)', async () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const settings = screen.getByRole('complementary', { name: 'QR Code Settings' });
    const preview = screen.getByRole('region', { name: 'QR Code Preview' });
    const content = within(settings).getByRole('heading', { name: 'Content' });
    const appearance = await screen.findByRole('heading', { name: 'Appearance' }, { timeout: 10000 });

    expect(content.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(preview.compareDocumentPosition(appearance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // A mobile jump link keeps preview and download one tap away.
    expect(screen.getByRole('link', { name: 'Preview & download' })).toHaveAttribute('href', '#qr-preview');
  });

  it('renders how-to/FAQ outside the tool column at article width', () => {
    render(<ToastProvider><QRTool toolId="wifi-qr-code" /></ToastProvider>);
    const settings = screen.getByRole('complementary', { name: 'QR Code Settings' });
    const educational = document.getElementById('content-section');
    expect(educational).not.toBeNull();
    expect(settings).not.toContainElement(educational);
    expect(screen.getByRole('region', { name: 'QR Code Preview' })).not.toContainElement(educational);
    expect(educational?.parentElement).toHaveClass('max-w-3xl');
  });

  it('groups appearance into disclosure sections that expose state and keep their content mounted', async () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const patterns = await screen.findByRole('button', { name: 'Pattern & Colors' }, { timeout: 10000 });
    const layout = screen.getByRole('button', { name: 'Layout & Border' });
    const logo = screen.getByRole('button', { name: 'Logo' });

    expect(patterns).toHaveAttribute('aria-expanded', 'true');
    expect(layout).toHaveAttribute('aria-expanded', 'false');
    expect(logo).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(layout);
    expect(layout).toHaveAttribute('aria-expanded', 'true');
    const headline = screen.getByRole('button', { name: /Minimalist template/i });
    fireEvent.click(headline);
    const headlineInput = screen.getByLabelText('Template headline');
    fireEvent.change(headlineInput, { target: { value: 'Scan me' } });

    // Collapse and re-open: the same inputs are still there with their values.
    fireEvent.click(layout);
    expect(layout).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(layout.getAttribute('aria-controls') ?? '')).toHaveAttribute('hidden');
    fireEvent.click(layout);
    expect(screen.getByLabelText('Template headline')).toBe(headlineInput);
    expect(headlineInput).toHaveValue('Scan me');
  });

  it('keeps a logical heading hierarchy with a single h1', async () => {
    const { container } = render(<ToastProvider><QRTool toolId="wifi-qr-code" /></ToastProvider>);
    await screen.findByRole('button', { name: 'Pattern & Colors' }, { timeout: 10000 });
    const levels = headingLevels(container);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('server-renders the instructions and FAQ', () => {
    const html = renderToString(<ToastProvider><QRTool toolId="wifi-qr-code" /></ToastProvider>);
    const content = contentRegistry['wifi-qr-code'];
    expect(html).toContain('Frequently Asked Questions');
    expect(html).toContain(content.howTo?.name ?? 'How to');
    const faqs = content.faqs && content.faqs.length > 0 ? content.faqs : contentRegistry['index'].faqs ?? [];
    expect(faqs.length).toBeGreaterThan(0);
    expect(html).toContain(faqs[0].question.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'));
  });

  it('has one export row that steps aside on phones while a text field has focus', async () => {
    render(<ToastProvider><QRTool initialConfig={{ value: 'https://example.com' }} /></ToastProvider>);
    const row = screen.getByTestId('export-actions');
    expect(within(row).getAllByRole('button', { name: /^Download$/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Download$/ })).toHaveLength(1);
    expect(row).not.toHaveClass('max-md:hidden');

    const field = document.createElement('input');
    document.body.appendChild(field);
    act(() => field.focus());
    expect(row).toHaveClass('max-md:hidden');
    act(() => field.blur());
    expect(row).not.toHaveClass('max-md:hidden');
    field.remove();
  });
});
