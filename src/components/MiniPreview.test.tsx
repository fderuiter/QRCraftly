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

import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniPreview } from './MiniPreview';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

describe('MiniPreview', () => {
  let callback: ObserverCallback | undefined;
  const disconnect = vi.fn();

  beforeEach(() => {
    callback = undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: ObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const target = document.createElement('section');
    target.id = 'qr-preview';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.getElementById('qr-preview')?.remove();
  });

  it('shows a decorative thumbnail only while the preview is off screen', () => {
    const sourceRef = createRef<HTMLCanvasElement>();
    const { unmount } = render(<MiniPreview sourceRef={sourceRef} targetId="qr-preview" renderKey={1} />);
    expect(screen.queryByTestId('mini-preview')).not.toBeInTheDocument();

    act(() => callback?.([{ isIntersecting: false }]));
    const thumb = screen.getByTestId('mini-preview');
    expect(thumb).toHaveAttribute('aria-hidden', 'true');
    expect(thumb).toHaveAttribute('tabindex', '-1');
    expect(thumb).toHaveClass('md:hidden');

    act(() => callback?.([{ isIntersecting: true }]));
    expect(screen.queryByTestId('mini-preview')).not.toBeInTheDocument();

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('scrolls back to the full preview when tapped', () => {
    render(<MiniPreview sourceRef={createRef<HTMLCanvasElement>()} targetId="qr-preview" renderKey={1} />);
    act(() => callback?.([{ isIntersecting: false }]));
    fireEvent.click(screen.getByTestId('mini-preview'));
    expect(document.getElementById('qr-preview')?.scrollIntoView).toHaveBeenCalled();
  });
});
