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

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate } from 'vike/client/router';
import GamePage from '@/pages/game/+Page';
import GameHead from '@/pages/game/+Head';
import DestroyPage from '@/pages/destroy-the-qr/+Page';
import DestroyHead from '@/pages/destroy-the-qr/+Head';
import { getLegacyRedirect } from '@/data/contentRegistry';

vi.mock('vike/client/router', () => ({ navigate: vi.fn(() => Promise.resolve()) }));

beforeEach(() => {
  vi.mocked(navigate).mockClear();
});

describe('legacy game routes (#927)', () => {
  it('redirects /destroy-the-qr to the Arcade Blaster on the client', async () => {
    render(<DestroyPage />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/arcade?mode=blaster', { overwriteLastHistoryEntry: true }));
    expect(screen.getByRole('link', { name: 'Open the QR Arcade' })).toHaveAttribute('href', '/arcade?mode=blaster');
  });

  it('redirects /game to the Damage Simulator on the client', async () => {
    render(<GamePage />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/arcade?mode=simulator', { overwriteLastHistoryEntry: true }));
  });

  it('falls back to a hard redirect when client routing is unavailable', async () => {
    vi.mocked(navigate).mockRejectedValueOnce(new Error('not ready'));
    const replace = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, replace } });
    render(<GamePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/arcade?mode=simulator'));
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('ships a no-JavaScript meta refresh and noindex in the static head', () => {
    expect(renderToStaticMarkup(<GameHead />)).toContain('content="0; url=/arcade?mode=simulator"');
    const destroy = renderToStaticMarkup(<DestroyHead />);
    expect(destroy).toContain('http-equiv="refresh"');
    expect(destroy).toContain('noindex');
  });

  it('records each retired route and its canonical destination in the content registry', () => {
    expect(getLegacyRedirect('/game')).toMatchObject({ redirectTo: '/arcade?mode=simulator', canonicalPath: '/arcade' });
    expect(getLegacyRedirect('/destroy-the-qr/')).toMatchObject({ redirectTo: '/arcade?mode=blaster' });
    expect(getLegacyRedirect('/arcade')).toBeUndefined();
  });

  it('no longer has a custom blank layout for /destroy-the-qr', () => {
    const layouts = import.meta.glob('/src/pages/destroy-the-qr/+Layout.tsx');
    expect(Object.keys(layouts)).toHaveLength(0);
  });
});
