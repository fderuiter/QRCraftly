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

import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useTurnstile, TURNSTILE_SCRIPT_SRC, type TurnstileApi } from './useTurnstile';

type RenderOptions = Parameters<TurnstileApi['render']>[1];

function installFakeTurnstile() {
  let options: RenderOptions | undefined;
  const api: TurnstileApi = {
    render: vi.fn((_el: HTMLElement, opts: RenderOptions) => {
      options = opts;
      return 'widget-1';
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  window.turnstile = api;
  return { api, emit: (token: string) => options?.callback(token), expire: () => options?.['expired-callback']?.() };
}

function mountWithContainer(siteKey: string | undefined, enabled: boolean) {
  return renderHook(({ key, on }) => {
    const hook = useTurnstile(key, on);
    if (!hook.containerRef.current) hook.containerRef.current = document.createElement('div');
    return hook;
  }, { initialProps: { key: siteKey, on: enabled } });
}

afterEach(() => {
  delete window.turnstile;
  document.head.querySelectorAll('script').forEach((s) => s.remove());
});

describe('useTurnstile', () => {
  it('does nothing and loads no third-party script while disabled', () => {
    const { result } = mountWithContainer('site-key', false);
    expect(result.current.status).toBe('idle');
    expect(document.head.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)).toBeNull();
  });

  it('reports unconfigured when no site key is set', () => {
    const { result } = mountWithContainer(undefined, true);
    expect(result.current.status).toBe('unconfigured');
    expect(result.current.token).toBeNull();
  });

  it('renders the real widget and exposes, expires and resets the token', async () => {
    const { api, emit, expire } = installFakeTurnstile();
    const { result, unmount } = mountWithContainer('site-key', true);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(api.render).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ sitekey: 'site-key' }));

    act(() => emit('real-token'));
    expect(result.current.token).toBe('real-token');
    act(() => expire());
    expect(result.current.token).toBeNull();

    act(() => emit('second'));
    act(() => result.current.reset());
    expect(result.current.token).toBeNull();
    expect(api.reset).toHaveBeenCalledWith('widget-1');

    unmount();
    expect(api.remove).toHaveBeenCalledWith('widget-1');
  });

  it('injects the explicit-render script once and reports a load error', async () => {
    const { result } = mountWithContainer('site-key', true);
    const script = document.head.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
    expect(script).not.toBeNull();
    act(() => script?.onerror?.(new Event('error')));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
